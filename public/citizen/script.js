// This ensures that our script runs only after the entire HTML document has been loaded and parsed.
document.addEventListener('DOMContentLoaded', () => {
    // --- Get Element References ---
    // We grab all the HTML elements we need to interact with and store them in constants.
    const reportForm = document.getElementById('report-form');
    const trackForm = document.getElementById('track-form');
    const reportResult = document.getElementById('report-result');
    const trackResult = document.getElementById('track-result');
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');
    const locationStatus = document.getElementById('location-status');
    const submitBtn = document.getElementById('submit-btn');
    const issueImageInput = document.getElementById('issue-image');
    const fileNameSpan = document.getElementById('file-name-span');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');

    // --- Core Functions ---

    /**
     * Attempts to get the user's current GPS location using the browser's Geolocation API.
     */
    function getGeoLocation() {
        // Check if the browser supports Geolocation
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                // Success Callback: This function runs if the user allows location access.
                (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    latitudeInput.value = lat;
                    longitudeInput.value = lon;
                    locationStatus.innerHTML = `✅ Location Acquired <br> (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
                    locationStatus.classList.remove('text-red-500');
                    locationStatus.classList.add('text-green-600');
                    submitBtn.disabled = false; // Enable the submit button
                },
                // Error Callback: This function runs if there's an error or user denies access.
                (error) => {
                    locationStatus.textContent = `❌ Error: ${error.message}. Please enable location access.`;
                    locationStatus.classList.add('text-red-500');
                    submitBtn.disabled = true; // Keep submit button disabled
                }
            );
        } else {
            locationStatus.textContent = 'Geolocation is not supported by this browser.';
            locationStatus.classList.add('text-red-500');
            submitBtn.disabled = true;
        }
    }

    /**
     * Displays a message to the user, styled as either success or error.
     * @param {HTMLElement} element - The HTML element where the message will be displayed.
     * @param {string} message - The message text.
     * @param {boolean} isSuccess - Determines the styling (true for green, false for red).
     */
    function showMessage(element, message, isSuccess) {
        element.innerHTML = message;
        element.className = isSuccess
            ? 'p-4 rounded-lg bg-green-100 text-green-800'
            : 'p-4 rounded-lg bg-red-100 text-red-800';
    }

    // --- Event Listeners ---

    // Handle the report form submission.
    reportForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent the default browser form submission
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        // Use FormData to easily collect all form fields, including the image file.
        const formData = new FormData(reportForm);
        
        try {
            const response = await fetch('/api/report', {
                method: 'POST',
                body: formData 
            });

            const result = await response.json();

            if (!response.ok) {
                // If the server returns an error (e.g., 400, 500), throw an error to be caught by the catch block.
                throw new Error(result.message || 'An unknown error occurred.');
            }
            
            // On success:
            const successMessage = `<strong>Success!</strong> ${result.message}<br>Your Tracking ID is: <strong class="text-xl font-mono">${result.issueId}</strong>`;
            showMessage(reportResult, successMessage, true);
            reportForm.reset(); // Clear the form
            fileNameSpan.textContent = 'Choose a file'; // Reset file input text
            imagePreviewContainer.classList.add('hidden'); // Hide image preview
            getGeoLocation(); // Re-fetch location for the next report

        } catch (error) {
            showMessage(reportResult, `<strong>Error:</strong> ${error.message}`, false);
        } finally {
            // This block runs regardless of success or failure.
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Report';
        }
    });

    // Handle the track issue form submission.
    trackForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        trackResult.innerHTML = '<p class="text-gray-500">Searching...</p>'; // Provide instant feedback
        const issueId = document.getElementById('issue-id-input').value.trim();
        
        if (!issueId || !/^\d{6}$/.test(issueId)) {
            showMessage(trackResult, 'Please enter a valid 6-digit Issue ID.', false);
            return;
        }

        try {
            const response = await fetch(`/api/track_status/${issueId}`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message);
            }

            // Dynamically create the HTML to display the tracking result.
            const statusHtml = `
                <div class="p-4 rounded-lg bg-gray-50 border">
                    <h3 class="font-bold text-lg text-gray-800">Status for ID: ${result.issueId}</h3>
                    <p class="text-gray-600"><strong class="font-medium text-gray-700">Type:</strong> ${result.issueType}</p>
                    <p class="text-gray-600"><strong class="font-medium text-gray-700">Status:</strong> <span class="font-bold text-blue-600">${result.status}</span></p>
                    <p class="text-gray-600"><strong class="font-medium text-gray-700">Reported On:</strong> ${new Date(result.reportedAt).toLocaleString()}</p>
                    ${result.assignedTo ? `<p class="text-gray-600"><strong class="font-medium text-gray-700">Assigned To:</strong> ${result.assignedTo.name}</p>` : ''}
                </div>
            `;
            trackResult.innerHTML = statusHtml;

        } catch (error) {
            showMessage(trackResult, `<strong>Error:</strong> ${error.message}`, false);
        }
    });

    // Handle file selection to show a preview and the file name.
    issueImageInput.addEventListener('change', () => {
        const file = issueImageInput.files[0];
        if (file) {
            fileNameSpan.textContent = file.name; // Show the selected file's name
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                imagePreviewContainer.classList.remove('hidden'); // Show the preview container
            }
            reader.readAsDataURL(file); // Read the file to generate a data URL for the preview
        } else {
            fileNameSpan.textContent = 'Choose a file';
            imagePreviewContainer.classList.add('hidden');
        }
    });

    // --- Initial Page Load ---
    // Immediately disable the submit button until location is confirmed.
    submitBtn.disabled = true;
    // Start the process of getting the user's location as soon as the page loads.
    getGeoLocation();
});
