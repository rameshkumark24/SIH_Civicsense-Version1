// --- Import Core Modules ---
const express = require('express');
const multer = require('multer'); // Middleware for handling file uploads (e.g., images)
const path = require('path');   // Helper for working with file and directory paths

// --- Import Database Models ---
const Issue = require('../models/Issue');
const User = require('../models/User');

// --- Import Services ---
const { sendNotification } = require('../services/notificationService');

// --- Initialize Express Router ---
const router = express.Router();

// --- Multer Configuration for File Uploads ---
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: function(req, file, cb){
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, 
    fileFilter: function(req, file, cb){
        checkFileType(file, cb);
    }
}).single('issueImage'); 

function checkFileType(file, cb){
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if(mimetype && extname){
        return cb(null, true);
    } else {
        cb('Error: Please upload images only (jpeg, jpg, png, gif).');
    }
}

function generateIssueId() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// --- API ENDPOINTS ---

/**
 * @route   POST /api/report
 * @desc    Submit a new civic issue from the citizen portal.
 * @access  Public
 */
router.post('/report', (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: 'File upload error.', error: err });
        }
        
        try {
            const { issueType, latitude, longitude, landmark, description, citizenContact } = req.body;

            if (!issueType || !latitude || !longitude || !description || !citizenContact) {
                return res.status(400).json({ message: 'Missing required fields. Please fill out all parts of the form.' });
            }

            let assignedDepartment = 'General Services'; // Default
            if (issueType === 'Garbage Overflow') assignedDepartment = 'Sanitation';
            else if (issueType === 'Pothole') assignedDepartment = 'Public Works';
            else if (issueType === 'Streetlight Outage') assignedDepartment = 'Electrical';
            else if (issueType === 'Water Leakage') assignedDepartment = 'Water Department';

            const newIssue = new Issue({
                issueId: generateIssueId(),
                issueType,
                location: {
                    type: 'Point',
                    coordinates: [parseFloat(longitude), parseFloat(latitude)],
                    landmark
                },
                description,
                citizenContact,
                imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
                assignedDepartment
            });

            await newIssue.save();
            
            const confirmationMessage = `Thank you! Your issue report (#${newIssue.issueId} - ${issueType}) has been received. We will keep you updated on its progress.`;
            sendNotification(citizenContact, confirmationMessage);

            res.status(201).json({
                message: 'Issue reported successfully!',
                issueId: newIssue.issueId
            });

        } catch (error) {
            console.error('Server Error @ POST /api/report:', error);
            res.status(500).json({ message: 'An unexpected server error occurred while submitting your report.' });
        }
    });
});

/**
 * @route   GET /api/issues
 * @desc    Get all issues for the admin dashboard.
 * @access  Private (In a real app, this should be protected with authentication)
 */
router.get('/issues', async (req, res) => {
    try {
        const issues = await Issue.find()
            .populate('assignedTo', 'name department') 
            .sort({ reportedAt: -1 });
        res.status(200).json(issues);
    } catch (error) {
        console.error('Server Error @ GET /api/issues:', error);
        res.status(500).json({ message: 'Failed to fetch issues from the database.' });
    }
});

/**
 * @route   POST /api/update_status
 * @desc    Allows an admin to update the status of an issue.
 * @access  Private
 */
router.post('/update_status', async (req, res) => {
    try {
        const { issueId, status } = req.body;
        if (!issueId || !status) {
            return res.status(400).json({ message: 'Issue ID and a new status are required.' });
        }

        const updateData = { status };
        if (status === 'Resolved') {
            updateData.resolvedAt = new Date();
        }

        const updatedIssue = await Issue.findOneAndUpdate({ issueId }, { $set: updateData }, { new: true });

        if (!updatedIssue) {
            return res.status(404).json({ message: 'Issue not found with that ID.' });
        }
        
        const updateMessage = `Update for issue #${issueId}: The status has been changed to "${status}".`;
        sendNotification(updatedIssue.citizenContact, updateMessage);
        
        res.status(200).json({ message: 'Status updated successfully!', issue: updatedIssue });
    } catch (error) {
        console.error('Server Error @ POST /api/update_status:', error);
        res.status(500).json({ message: 'Failed to update issue status.' });
    }
});

/**
 * @route   POST /api/assign_issue
 * @desc    Allows an admin to assign an issue to a specific staff member.
 * @access  Private
 */
router.post('/assign_issue', async (req, res) => {
    try {
        const { issueId, userId } = req.body;
        if (!issueId || !userId) {
            return res.status(400).json({ message: 'Issue ID and User ID are required for assignment.' });
        }

        const issue = await Issue.findOne({ issueId: issueId });
        if (!issue) {
            return res.status(404).json({ message: 'Issue not found with that ID.' });
        }

        issue.assignedTo = userId;
        await issue.save();
        
        const updatedIssue = await Issue.findById(issue._id).populate('assignedTo', 'name department');
        res.status(200).json({ message: 'Issue assigned successfully!', issue: updatedIssue });
    } catch (error) {
        console.error('Server Error @ POST /api/assign_issue:', error);
        res.status(500).json({ message: 'Failed to assign issue.' });
    }
});

/**
 * @route   GET /api/users
 * @desc    Get all staff users for the assignment dropdown in the admin panel.
 * @access  Private
 */
router.get('/users', async (req, res) => {
    try {
        const users = await User.find().select('name department');
        res.status(200).json(users);
    } catch (error) {
        console.error('Server Error @ GET /api/users:', error);
        res.status(500).json({ message: 'Failed to fetch users.' });
    }
});

/**
 * @route   GET /api/analytics
 * @desc    Get aggregated data for the admin dashboard analytics.
 * @access  Private
 */
router.get('/analytics', async (req, res) => {
    try {
        // --- Calculate Average Resolution Time (BUG FIX APPLIED) ---
        // Use { $ne: null } to ensure resolvedAt is a valid date, not just that the field exists.
        const resolvedIssues = await Issue.find({ status: 'Resolved', resolvedAt: { $ne: null } });
        
        let totalResolutionTimeMs = 0;
        let validResolvedCount = 0; // Only count issues where we can calculate time.

        if (resolvedIssues.length > 0) {
            resolvedIssues.forEach(issue => {
                // **THE FIX:** Check if both dates are valid before doing math.
                // This prevents the server from crashing on old or inconsistent data.
                if (issue.resolvedAt instanceof Date && issue.reportedAt instanceof Date) {
                    totalResolutionTimeMs += issue.resolvedAt.getTime() - issue.reportedAt.getTime();
                    validResolvedCount++;
                }
            });
        }
        
        const avgResolutionTimeMs = validResolvedCount > 0 ? totalResolutionTimeMs / validResolvedCount : 0;
        const avgResolutionTimeHours = (avgResolutionTimeMs / (1000 * 60 * 60)).toFixed(1);


        // --- Get Issue Counts by Type (for trend analysis) ---
        const trendData = await Issue.aggregate([
            { $group: { _id: '$issueType', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // --- Get Issue Counts by Status (for overview) ---
        const statusCounts = await Issue.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        res.status(200).json({
            avgResolutionTimeHours,
            trendData,
            statusCounts
        });
    } catch (error) {
        console.error('Server Error @ GET /api/analytics:', error);
        res.status(500).json({ message: 'Failed to fetch analytics data.' });
    }
});


/**
 * @route   GET /api/track_status/:issue_id
 * @desc    Allows a citizen to track the status of their submitted report.
 * @access  Public
 */
router.get('/track_status/:issue_id', async (req, res) => {
    try {
        const issue = await Issue.findOne({ issueId: req.params.issue_id }).populate('assignedTo', 'name');
        if (!issue) {
            return res.status(404).json({ message: 'Issue ID not found. Please double-check the ID and try again.' });
        }
        res.status(200).json(issue);
    } catch (error) {
        console.error('Server Error @ GET /api/track_status:', error);
        res.status(500).json({ message: 'Server error while fetching your issue status.' });
    }
});

// We export the configured router so it can be used in our main server.js file.
module.exports = router;

