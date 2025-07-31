document.addEventListener('DOMContentLoaded', () => {
    const tableHead = document.querySelector('#tree-table thead tr');
    const tableBody = document.querySelector('#tree-table tbody');
    const configName = document.body.dataset.config;
    const countrySelectionDiv = document.getElementById('country-selection');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    let selectedCountries = [];
    let myPieChart; // To store the Chart.js instance

    // --- Tab Switching Logic ---
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;

            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            tabPanes.forEach(pane => {
                pane.classList.remove('active');
                // Destroy chart if tab is switched away from pie chart
                if (pane.id === 'pie-chart' && myPieChart) {
                    myPieChart.destroy();
                    myPieChart = null;
                }
            });
            document.getElementById(tab).classList.add('active');

            // Render content for the active tab
            if (tab === 'spreadsheet') {
                renderSpreadsheet();
            } else if (tab === 'pie-chart') {
                renderPieChart();
            }
        });
    });

    // --- Country Selection Logic ---
    function fetchCountries() {
        fetch(`/countries?config=${configName}`)
            .then(response => response.json())
            .then(countries => {
                countrySelectionDiv.innerHTML = ''; // Clear previous tiles
                countries.forEach(country => {
                    const tile = document.createElement('div');
                    tile.classList.add('country-tile');
                    tile.textContent = country;
                    tile.addEventListener('click', () => {
                        tile.classList.toggle('selected');
                        if (tile.classList.contains('selected')) {
                            selectedCountries.push(country);
                        } else {
                            selectedCountries = selectedCountries.filter(c => c !== country);
                        }
                        // Re-render active tab content with new country selection
                        const activeTab = document.querySelector('.tab-button.active').dataset.tab;
                        if (activeTab === 'spreadsheet') {
                            renderSpreadsheet();
                        } else if (activeTab === 'pie-chart') {
                            renderPieChart();
                        }
                    });
                    countrySelectionDiv.appendChild(tile);
                });
            });
    }

    // --- Data Fetching and Rendering Functions ---
    function renderSpreadsheet() {
        const params = new URLSearchParams();
        params.append('config', configName);
        if (selectedCountries.length > 0) {
            params.append('countries', selectedCountries.join(','));
        }

        fetch(`/data?${params.toString()}`)
            .then(response => response.json())
            .then(response => {
                const { headers, data } = response;
                tableHead.innerHTML = ''; // Clear previous headers
                tableBody.innerHTML = ''; // Clear previous rows

                if (data.length > 0) {
                    headers.forEach(header => {
                        const th = document.createElement('th');
                        th.textContent = header.name;
                        tableHead.appendChild(th);
                    });
                    renderRows(data, tableBody, 0, headers);
                }
            });
    }

    function renderRows(items, parentElement, level, headers) {
        items.forEach(item => {
            const row = document.createElement('tr');
            row.dataset.level = level;

            headers.forEach(header => {
                const cell = document.createElement('td');
                cell.classList.add(`col-${header.name.replace(/\s+/g, '-').toLowerCase()}`);
                if (header.color) {
                    cell.classList.add(`col-color-${header.color.toLowerCase()}`);
                }

                if (header.name === 'name') {
                    cell.style.paddingLeft = `${level * 20}px`;
                    const expander = document.createElement('span');
                    expander.className = 'expand-icon';
                    if (item.children && item.children.length > 0) {
                        expander.textContent = '+';
                        expander.addEventListener('click', () => toggleRow(row, item.children, level + 1, headers));
                    } else {
                        expander.textContent = ' ';
                    }
                    cell.appendChild(expander);
                    cell.appendChild(document.createTextNode(`${item.name} `));
                } else {
                    const value = item[header.name];
                    if (header.name === 'Unemployment Rate') {
                        cell.textContent = `${value.toFixed(2)}%`;
                    } else {
                        cell.textContent = typeof value === 'number' ? value.toLocaleString() : value || '';
                    }
                    if (typeof value === 'number' && value < 0) {
                        cell.classList.add('negative-value');
                    }
                }
                row.appendChild(cell);
            });

            parentElement.appendChild(row);
        });
    }

    function toggleRow(parentRow, children, level, headers) {
        const nextRow = parentRow.nextElementSibling;
        const expander = parentRow.querySelector('.expand-icon');

        if (nextRow && nextRow.dataset.level > parentRow.dataset.level) {
            // Collapse
            while (parentRow.nextElementSibling && parentRow.nextElementSibling.dataset.level > parentRow.dataset.level) {
                parentRow.nextElementSibling.remove();
            }
            expander.textContent = '+';
        } else {
            // Expand
            const fragment = document.createDocumentFragment();
            renderRows(children, fragment, level, headers);
            parentRow.after(fragment);
            expander.textContent = '-';
        }
    }

    function renderPieChart() {
        const ctx = document.getElementById('population-pie-chart').getContext('2d');
        if (myPieChart) {
            myPieChart.destroy(); // Destroy existing chart before creating a new one
        }

        const params = new URLSearchParams();
        params.append('config', configName);
        if (selectedCountries.length > 0) {
            params.append('countries', selectedCountries.join(','));
        }

        fetch(`/pie_chart_data?${params.toString()}`)
            .then(response => response.json())
            .then(data => {
                myPieChart = new Chart(ctx, {
                    type: 'pie',
                    data: {
                        labels: data.map(item => item.continent),
                        datasets: [{
                            data: data.map(item => item.population),
                            backgroundColor: [
                                '#FF6384',
                                '#36A2EB',
                                '#FFCE56',
                                '#4BC0C0',
                                '#9966FF',
                                '#FF9F40'
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Population by Continent'
                            }
                        }
                    }
                });
            });
    }

    // Initial load
    fetchCountries();
    renderSpreadsheet(); // Render spreadsheet by default
});