// --- Import Mongoose ---
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// --- Define the Issue Schema ---
// This is the blueprint for every civic issue report stored in our database.
const IssueSchema = new Schema({
    // A unique, human-readable 6-digit ID for easy tracking by citizens.
    issueId: {
        type: String,
        required: true,
        unique: true,
        index: true // Indexing this field makes lookups by issueId much faster.
    },
    // The category of the issue. Using an enum ensures data consistency.
    issueType: {
        type: String,
        required: [true, 'Issue type is required.'],
        enum: ['Pothole', 'Garbage Overflow', 'Streetlight Outage', 'Water Leakage', 'Other']
    },
    // A detailed description of the issue provided by the citizen.
    description: {
        type: String,
        required: [true, 'A description of the issue is required.']
    },
    // GeoJSON location data for mapping and analysis.
    location: {
        type: {
            type: String,
            enum: ['Point'], // 'location.type' must be 'Point'
            required: true
        },
        coordinates: {
            type: [Number], // Array of numbers for [longitude, latitude]
            required: true
        },
        // A user-provided landmark for easier identification.
        landmark: {
            type: String
        }
    },
    // The URL path to an optional photo uploaded by the citizen.
    imageUrl: {
        type: String
    },
    // The current status of the issue resolution process.
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Acknowledged', 'In Progress', 'Resolved'],
        default: 'Pending' // New issues will automatically have a 'Pending' status.
    },
    // The citizen's contact number for receiving notifications.
    citizenContact: {
        type: String,
        required: [true, 'A contact number is required for status updates.']
    },
    // The municipal department automatically assigned to handle this type of issue.
    assignedDepartment: {
        type: String,
        required: true
    },
    // A reference to the specific staff member (from the User collection) assigned to this issue.
    assignedTo: {
        type: Schema.Types.ObjectId,
        ref: 'User' // This tells Mongoose to link to the 'User' model.
    },
    // A timestamp for when the issue was marked as resolved.
    // This is crucial for calculating resolution time analytics.
    resolvedAt: {
        type: Date
    }
}, {
    // Schema Options:
    // 'timestamps: true' automatically adds 'createdAt' and 'updatedAt' fields.
    timestamps: true
});

// Create a geospatial index on the location field to enable efficient location-based queries.
// This is essential for features like "find issues near me" or for rendering issues on a map efficiently.
IssueSchema.index({ location: '2dsphere' });

// --- Create and Export the Issue Model ---
// This compiles our schema into a model, which is a class that we can use to interact
// with the 'issues' collection in our MongoDB database.
module.exports = mongoose.model('Issue', IssueSchema);

