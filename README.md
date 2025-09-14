CivicSense: Smart Civic Issue Reporting & Resolution System
CivicSense is a full-stack web application designed to bridge the gap between citizens and municipal authorities. It provides a seamless, mobile-first platform for reporting local civic issues like potholes and garbage overflow, and a powerful administrative dashboard for efficient tracking, management, and resolution.

Key Features
Citizen Portal (/)
Mobile-First Design: A clean, responsive interface that works perfectly on any device.
GPS-Powered Reporting: Automatically captures the user's precise location to accurately pinpoint issues.
Image Uploads: Citizens can upload photographic evidence of the issue.
Simple & Intuitive Form: A straightforward form for describing the issue and providing contact details for updates.
Real-Time Tracking: Citizens receive a 6-digit tracking ID to check the status of their report at any time.

Admin Dashboard (/admin/)
Private & Secure: A dedicated portal for municipal staff.
At-a-Glance Analytics: A modern dashboard with key metrics like total pending issues, average resolution time, and the most frequently reported issue types.
Interactive Map View: Visualizes all reported issues on a map with markers and a heatmap to identify problem hotspots.
Issue Trends Chart: A bar chart that breaks down the number of reports by category for better resource allocation.

Powerful Table Management:
Filter & Search: Instantly filter issues by their status or search by their unique ID.
Task Assignment: Assign issues to specific staff members or departments from a dropdown menu.
Status Updates: Update the status of any issue (Pending, Acknowledged, In Progress, Resolved) with a single click.
In-App Image Viewer: View uploaded images in a clean modal popup without ever leaving the dashboard.

Technology Stack
Backend: Node.js, Express.js
Database: MongoDB with Mongoose ODM
Frontend: HTML5, Tailwind CSS, Vanilla JavaScript
Interactivity: Alpine.js for lightweight UI state management (modals, sidebars).
Mapping: Leaflet.js for the interactive map and heatmap.
Charts: Chart.js for data visualization.
File Uploads: Multer for handling image uploads.
Environment Management: dotenv for managing configuration variables.

Project Setup & Installation
Follow these steps to get the project running on your local machine.

Prerequisites
Node.js (which includes npm) installed on your system.
MongoDB installed and running locally.
npm run dev
