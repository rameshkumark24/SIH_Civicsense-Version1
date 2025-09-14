// --- Import Mongoose ---
// Mongoose is a library that makes working with MongoDB easier and more structured.
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// --- Define the User Schema ---
// A schema is a blueprint that defines the structure and properties of a document in a collection.
const UserSchema = new Schema({
    // 'name' field for the staff member's full name.
    name: {
        type: String,
        required: [true, 'User name is required.'] // This field must be provided.
    },
    // 'email' field for the staff member's unique email address.
    email: {
        type: String,
        required: [true, 'Email is required.'],
        unique: true, // Ensures no two users can have the same email address.
        match: [/.+\@.+\..+/, 'Please enter a valid email address.'] // Basic email format validation.
    },
    // 'password' field. In a real-world application, this should always be hashed before saving.
    password: {
        type: String,
        required: [true, 'Password is required.']
    },
    // 'department' field to specify which department the user belongs to.
    department: {
        type: String,
        required: [true, 'Department is required.'],
        // 'enum' restricts the possible values for this field, ensuring data consistency.
        enum: ['Sanitation', 'Public Works', 'Electrical', 'Water Department', 'General Services']
    }
}, {
    // --- Schema Options ---
    // 'timestamps: true' automatically adds 'createdAt' and 'updatedAt' fields to each document.
    // This is useful for tracking when a user was created or last modified.
    timestamps: true
});

// --- Create and Export the User Model ---
// mongoose.model() compiles our schema into a model. A model is a constructor that allows us
// to create, read, update, and delete documents in the 'users' collection in our MongoDB database.
// We export this model so it can be used by other parts of our application, like the API routes.
module.exports = mongoose.model('User', UserSchema);

