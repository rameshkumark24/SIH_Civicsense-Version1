// This ensures that our script runs only after the entire HTML document has been loaded.
document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    // These variables will hold the master copies of our data.
    let allIssues = [];
    let allUsers = [];
    let trendsChart = null; // This will hold our Chart.js instance

    // --- DOM Element References ---
    const issuesTbody = document.getElementById('issues-tbody');
    const refreshBtn = document.getElementById('refresh-btn');
    const filterStatusEl = document.getElementById('filter-status');
    const searchIdEl = document.getElementById('search-id');
    const chartCanvas = document.getElementById('issue-trends-chart');

    // --- Leaflet Map Initialization ---
    // Centered on a location in India. You can change these coordinates.
    const map = L.map('map').setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    let heatLayer = null; // To hold the heatmap layer
    let markers = L.layerGroup().addTo(map); // To hold all the issue markers

    // --- Core Data Fetching and Rendering ---

    /**
     * Fetches all necessary data from the backend API endpoints.
     */
    async function fetchData() {
        showLoadingState();
        try {
            // Use Promise.all to fetch data concurrently for better performance.
            const [issuesRes, usersRes, analyticsRes] = await Promise.all([
                fetch('/api/issues'),
                fetch('/api/users'),
                fetch('/api/analytics')
            ]);

            if (!issuesRes.ok || !usersRes.ok || !analyticsRes.ok) {
                throw new Error('Failed to fetch data from the server.');
            }

            allIssues = await issuesRes.json();
            allUsers = await usersRes.json();
            const analytics = await analyticsRes.json();
            
            // Once data is fetched, update all parts of the dashboard.
            updateAnalytics(analytics);
            renderTrendsChart(analytics.trendData);
            renderTable(allIssues);
            updateMap(allIssues);

        } catch (error) {
            console.error("Failed to fetch data:", error);
            issuesTbody.innerHTML = `<tr><td colspan="5" class="text-center p-8 text-red-500">Error: Could not fetch data. Please refresh.</td></tr>`;
        }
    }
    
    /**
     * Fetches ONLY the analytics data to update the cards and chart. This is much
     * faster than a full refresh and is used after a single issue is updated.
     */
    async function fetchAndRefreshAnalytics() {
        try {
            const analyticsRes = await fetch('/api/analytics');
            if (!analyticsRes.ok) return;
            const analytics = await analyticsRes.json();
            updateAnalytics(analytics);
            renderTrendsChart(analytics.trendData);
        } catch (error) {
            console.error("Could not refresh analytics:", error);
        }
    }

    /**
     * Updates the analytics cards with fresh data.
     * @param {object} analytics - The analytics data object from the API.
     */
    function updateAnalytics(analytics) {
        const pendingStatuses = ['Pending', 'Acknowledged', 'In Progress'];
        const totalPending = analytics.statusCounts.filter(s => pendingStatuses.includes(s._id)).reduce((sum, s) => sum + s.count, 0);
        const totalResolved = analytics.statusCounts.find(s => s._id === 'Resolved')?.count || 0;
        const mostReported = analytics.trendData[0] ? `${analytics.trendData[0]._id}` : 'N/A';

        document.getElementById('total-pending').textContent = totalPending;
        document.getElementById('total-resolved').textContent = totalResolved;
        document.getElementById('avg-resolution-time').textContent = `${analytics.avgResolutionTimeHours} hrs`;
        document.getElementById('most-reported-type').textContent = mostReported;
    }
    
    /**
     * Renders the bar chart for issue type trends using Chart.js.
     * @param {Array} trendData - Data for the chart.
     */
    function renderTrendsChart(trendData) {
        if (trendsChart) {
            trendsChart.destroy(); // Destroy the old chart instance to prevent conflicts
        }
        
        const labels = trendData.map(item => item._id);
        const data = trendData.map(item => item.count);

        trendsChart = new Chart(chartCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Number of Reports',
                    data: data,
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } },
                plugins: { legend: { display: false } }
            }
        });
    }

    /**
     * Renders the issues data into the main table.
     * @param {Array} issuesToRender - An array of issue objects to display.
     */
    function renderTable(issuesToRender) {
        issuesTbody.innerHTML = ''; 

        if (issuesToRender.length === 0) {
            issuesTbody.innerHTML = `<tr><td colspan="5" class="text-center p-8 text-gray-500">No issues found.</td></tr>`;
            return;
        }

        issuesToRender.forEach(issue => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';

            const assignedToName = issue.assignedTo ? issue.assignedTo.name : 'Unassigned';
            const userOptions = allUsers.map(user => 
                `<option value="${user._id}" ${issue.assignedTo?._id === user._id ? 'selected' : ''}>
                    ${user.name} (${user.department})
                </option>`
            ).join('');

            let statusColor = 'bg-gray-200 text-gray-800';
            if (issue.status === 'Acknowledged') statusColor = 'bg-blue-100 text-blue-800';
            if (issue.status === 'In Progress') statusColor = 'bg-yellow-100 text-yellow-800';
            if (issue.status === 'Resolved') statusColor = 'bg-green-100 text-green-800';

            // This button uses Alpine.js attributes to open the modal and set the image URL
            const viewImageButton = issue.imageUrl 
                ? `<button @click="imageModalOpen = true; modalImageUrl = '${issue.imageUrl}'" class="text-indigo-600 hover:text-indigo-900 text-xs font-medium">View Image</button>` 
                : '<span class="text-xs text-gray-400">No Image</span>';

            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${issue.issueId}</td>
                <td class="px-6 py-4 text-sm text-gray-900">
                    <div class="font-bold">${issue.issueType}</div>
                    <div class="text-gray-500">${issue.location.landmark}</div>
                     ${viewImageButton}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="status-tag ${statusColor}">${issue.status}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <select class="assign-select w-full rounded-md border-gray-300 shadow-sm text-xs" data-id="${issue.issueId}">
                        <option value="">${assignedToName}</option>
                        ${userOptions}
                    </select>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <select class="action-select w-full rounded-md border-gray-300 shadow-sm text-xs" data-id="${issue.issueId}" ${issue.status === 'Resolved' ? 'disabled' : ''}>
                        <option value="">Set Status</option>
                        <option value="Acknowledged">Acknowledge</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolve</option>
                    </select>
                </td>
            `;
            issuesTbody.appendChild(row);
        });
    }

    /**
     * Updates the map with markers and a heatmap based on issue locations.
     * @param {Array} issues - An array of issue objects.
     */
    function updateMap(issues) {
        markers.clearLayers();
        if (heatLayer) map.removeLayer(heatLayer);

        const heatPoints = [];
        issues.forEach(issue => {
            if (issue.location && issue.location.coordinates) {
                const [lon, lat] = issue.location.coordinates;
                L.marker([lat, lon]).addTo(markers)
                  .bindPopup(`<b>${issue.issueType} (#${issue.issueId})</b><br>${issue.description}<br>Status: ${issue.status}`);
                
                if (issue.status !== 'Resolved') {
                    heatPoints.push([lat, lon, 0.8]);
                }
            }
        });
        
        if (heatPoints.length > 0) {
            heatLayer = L.heatLayer(heatPoints, { radius: 25, blur: 15 }).addTo(map);
        }
    }

    /**
     * Filters and searches the master list of issues and re-renders the table.
     */
    function applyFilters() {
        const statusFilter = filterStatusEl.value;
        const searchTerm = searchIdEl.value.trim().toLowerCase();

        let filteredIssues = allIssues;

        if (statusFilter) {
            filteredIssues = filteredIssues.filter(issue => issue.status === statusFilter);
        }

        if (searchTerm) {
            filteredIssues = filteredIssues.filter(issue => issue.issueId.includes(searchTerm));
        }

        renderTable(filteredIssues);
    }
    
    function showLoadingState() {
        issuesTbody.innerHTML = `<tr><td colspan="5" class="text-center p-8 text-gray-500">Loading issues...</td></tr>`;
        const loadingText = '...';
        document.getElementById('total-pending').textContent = loadingText;
        document.getElementById('total-resolved').textContent = loadingText;
        document.getElementById('avg-resolution-time').textContent = loadingText;
        document.getElementById('most-reported-type').textContent = loadingText;
    }

    // --- Event Listeners ---
    issuesTbody.addEventListener('change', async (e) => {
        const target = e.target;
        const issueId = target.dataset.id;
        if (!issueId) return;

        try {
            let response;
            if (target.classList.contains('action-select')) {
                const status = target.value;
                if (!status) return;
                response = await fetch('/api/update_status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ issueId, status })
                });
            } else if (target.classList.contains('assign-select')) {
                const userId = target.value;
                if (!userId) return;
                response = await fetch('/api/assign_issue', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ issueId, userId })
                });
            }

            if (response && response.ok) {
                const { issue: updatedIssue } = await response.json();
                
                const issueIndex = allIssues.findIndex(i => i._id === updatedIssue._id);
                if (issueIndex !== -1) {
                    allIssues[issueIndex] = updatedIssue;
                }
                
                renderTable(allIssues);
                fetchAndRefreshAnalytics();

            } else if (response) {
                 const err = await response.json();
                 throw new Error(err.message);
            }

        } catch (err) {
            alert(`Error updating issue: ${err.message}`);
            fetchData();
        }
    });
    
    refreshBtn.addEventListener('click', fetchData);
    filterStatusEl.addEventListener('change', applyFilters);
    searchIdEl.addEventListener('input', applyFilters);

    // --- Initial Load ---
    fetchData();
});

