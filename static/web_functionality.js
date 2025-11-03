  // --- 1. DOM REFERENCES & STATE ---
        const tableBody = document.getElementById('data-table-body');
        const tableHeader = document.getElementById('table-header');
        const resultCountSpan = document.getElementById('result-count');
        const filterControls = document.getElementById('filter-controls');
        const loadingOverlay = document.getElementById('loading-overlay');
        const emptyState = document.getElementById('empty-state');

        let debounceTimer;

        // --- 2. RENDERING LOGIC ---

        // Function to toggle the visibility of the detail row
        function toggleDetail(rowKey) {
            const detailRow = document.getElementById(`detail-row-${rowKey}`);
            const mainRow = document.querySelector(`tr[data-row-key="${rowKey}"]`);

            if (detailRow.style.display === 'none' || detailRow.style.display === '') {
                detailRow.style.display = 'table-row';
                mainRow.classList.add('bg-blue-100'); // Highlight main row when open
            } else {
                detailRow.style.display = 'none';
                mainRow.classList.remove('bg-blue-100'); // Remove highlight when closed
            }
        }

        function formatValue(key, value) {
            // Apply specific formatting for the 'Thumbs' column
            if (key === 'Thumbs') {
                if (value === 'True') return '👍 Up';
                if (value === 'False') return '👎 Down';
            }
            // truncate the text
            if(typeof value == 'string' && value.length > 50){
                return value.substring(0, 50) + '...';
            }

            return value;
        }

        function renderTable(data, columns) {
            // Clear previous content
            tableHeader.innerHTML = '';
            tableBody.innerHTML = '';
            emptyState.classList.add('hidden');

            // Update result count
            resultCountSpan.textContent = data.length;

            if (data.length === 0) {
                emptyState.classList.remove('hidden');
                return;
            }

            // Render Header
            columns.forEach(col => {
                const th = document.createElement('th');
                th.className = 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]';
                // Convert 'User_Query' to 'User Query' etc.
                th.textContent = col.replace(/([A-Z])/g, ' $1').trim();
                tableHeader.appendChild(th);
            });

            // Render Body Rows
            data.forEach(item => {
                const rowKey = item.RowKey;

                // --- 1. MAIN ROW (TRUNCATED VIEW) ---
                const row = document.createElement('tr');
                row.className = 'clickable-row hover:bg-blue-50 transition duration-150';
                row.setAttribute('data-row-key', rowKey);
                row.onclick = () => toggleDetail(rowKey); // Attach click handler

                columns.forEach(colKey => {
                    const cell = document.createElement('td');
                    cell.className = 'px-4 py-3 text-sm text-gray-900 border-b border-gray-100 align-top';

                    // Add truncation class only to the long text fields
                    if (colKey === 'User_Query' || colKey === 'User_Feedback' || colKey === 'AI_Response') {
                        cell.className += ' max-w-[300px]';
                    }

                    cell.textContent = formatValue(colKey, item[colKey]);
                    row.appendChild(cell);
                });
                tableBody.appendChild(row);

                // --- 2. DETAIL ROW (EXPANDED FULL TEXT) ---
                const detailRow = document.createElement('tr');
                detailRow.id = `detail-row-${rowKey}`;
                detailRow.className = 'detail-row';

                const detailCell = document.createElement('td');
                // Span the detail row across all columns for full width
                detailCell.colSpan = columns.length;
                detailCell.className = 'px-6 py-4 text-xs text-gray-700 leading-relaxed border-b border-blue-200 shadow-inner';

                // Use innerHTML to inject structured full text content
                detailCell.innerHTML = `
                    <div class="space-y-4">
                        <p class="font-semibold text-sm text-gray-800 border-b pb-1">Expanded Details for RowKey: ${rowKey}</p>

                        <div class="bg-white p-3 border border-gray-200 rounded-lg">
                            <p class="font-medium text-gray-600 mb-1">User Query:</p>
                            <p class="text-gray-900 whitespace-pre-wrap">${item.User_Query}</p>
                        </div>


                        <div class="bg-white p-3 border border-gray-200 rounded-lg">
                            <p class="font-medium text-gray-600 mb-1">AI Response:</p>
                            <p class="text-gray-900 whitespace-pre-wrap">${item.AI_Response}</p>
                        </div>

                        <div class="bg-white p-3 border border-gray-200 rounded-lg">
                            <p class="font-medium text-gray-600 mb-1">User Feedback:</p>
                            <p class="text-gray-900 whitespace-pre-wrap">${item.User_Feedback}</p>
                        </div>
                    </div>
                `;

                detailRow.appendChild(detailCell);
                tableBody.appendChild(detailRow);

            });
        }


        // --- 3. DATA FETCHING & FILTERING ---

        async function fetchData() {
            // 1. Collect filter parameters from inputs
            const filters = {};
            const inputs = filterControls.querySelectorAll('[data-filter-param]');

            inputs.forEach(input => {
                const param = input.getAttribute('data-filter-param');
                const value = input.value.trim();
                // ONLY add filter if value exists AND it's not the default "All" option
                if (value && value !== 'All') {
                    filters[param] = value;
                }
            });

            // Build query string
            const queryString = new URLSearchParams(filters).toString();
            const apiUrl = `/api/data?${queryString}`;

            // Show loading state
            loadingOverlay.style.display = 'flex';

            try {
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    // This handles 404 or 500 responses gracefully
                    throw new Error(`HTTP error! status: ${response.status} from ${apiUrl}`);
                }

                // Try parsing the JSON
                const result = await response.json();

                // Render the new data
                renderTable(result.data, result.columns);

            } catch (error) {
                // Log the error to the console for debugging
                console.error('Error fetching or processing data. Check server terminal for details:', error);

                // Determine how many columns we need for the error message
                const headerCells = document.getElementById('table-header').cells.length || 8;

                // Display error message in the table area
                tableBody.innerHTML = `<tr><td colspan="${headerCells}" class="text-center py-6 text-red-500 font-semibold">
                    Error loading data. Check your Flask terminal for details.
                </td></tr>`;
                resultCountSpan.textContent = '0';
            } finally {
                // HIDE loading state (Crucial step that must always execute)
                loadingOverlay.style.display = 'none';
            }
        }

        // --- 4. EVENT LISTENERS ---

        function handleFilterChange() {
            // Clear any existing timer
            clearTimeout(debounceTimer);

            // Set a new timer to fetch data after a short delay (300ms)
            debounceTimer = setTimeout(() => {
                fetchData();
            }, 300);
        }

        // Attach event listeners to all filter controls
        document.addEventListener('DOMContentLoaded', () => {
            const inputs = filterControls.querySelectorAll('[data-filter-param]');
            inputs.forEach(input => {
                // 'input' event for text fields
                if (input.tagName === 'INPUT') {
                    input.addEventListener('input', handleFilterChange);
                }
                // 'change' event for select/dropdown fields
                else if (input.tagName === 'SELECT') {
                    input.addEventListener('change', handleFilterChange);
                }
            });

            // Initial data load when the page is ready
            fetchData();
        });