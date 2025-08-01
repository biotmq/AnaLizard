document.addEventListener('DOMContentLoaded', () => {
    const tableHead = document.querySelector('#tree-table thead tr');
    const tableBody = document.querySelector('#tree-table tbody');
    const countrySelectionDiv = document.getElementById('country-selection');
    const tabsContainer = document.getElementById('tabs');
    const tabContent = document.getElementById('tab-content');
    const pieChartContainer = document.getElementById('pie-chart');
    const pieChartButton = createTabButton({ name: 'Pie Chart' }, 'pie-chart');

    let selectedCountries = [];
    let myPieChart;
    let datasets = [];
    let activeDatasetName = '';

    function fetchDatasets() {
        fetch('/datasets')
            .then(response => response.json())
            .then(data => {
                datasets = data;
                renderTabs();
                if (datasets.length > 0) {
                    handleTabClick(datasets[0].name, 'spreadsheet');
                }
            });
    }

    function renderTabs() {
        tabsContainer.innerHTML = '';
        const groups = {};

        datasets.forEach(dataset => {
            const group = dataset.group || 'ungrouped';
            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(dataset);
        });

        for (const groupName in groups) {
            if (groupName !== 'ungrouped') {
                const groupContainer = document.createElement('div');
                groupContainer.classList.add('tab-group');
                const groupHeader = document.createElement('div');
                groupHeader.classList.add('tab-group-header');
                groupHeader.textContent = groupName;
                groupContainer.appendChild(groupHeader);
                tabsContainer.appendChild(groupContainer);

                groups[groupName].forEach(dataset => {
                    const button = createTabButton(dataset, 'spreadsheet');
                    groupContainer.appendChild(button);
                });
            } else {
                groups['ungrouped'].forEach(dataset => {
                    const button = createTabButton(dataset, 'spreadsheet');
                    tabsContainer.appendChild(button);
                });
            }
        }
        
        tabsContainer.appendChild(pieChartButton);
        tabsContainer.appendChild(createTabButton({ name: 'Charts' }, 'charts'));
        tabsContainer.appendChild(createTabButton({ name: 'User Guide' }, 'user-guide'));
    }

    function createTabButton(dataset, tabId) {
        const button = document.createElement('button');
        button.classList.add('tab-button');
        button.dataset.tab = tabId;
        button.dataset.dataset = dataset.name;
        button.textContent = dataset.name;
        if (dataset.color) {
            button.style.borderBottom = `3px solid ${dataset.color}`;
        }
        button.addEventListener('click', () => handleTabClick(dataset.name, tabId));
        return button;
    }

    function handleTabClick(datasetName, tabId) {
        activeDatasetName = datasetName;
        selectedCountries = []; // Reset selected countries on any tab click

        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

        const activeButton = document.querySelector(`.tab-button[data-dataset="${datasetName}"][data-tab="${tabId}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
        
        const activePane = document.getElementById(tabId);
        if (activePane) {
            activePane.classList.add('active');
        }

        if (activeDatasetName === 'Population') {
            countrySelectionDiv.style.display = 'flex';
            pieChartButton.style.display = 'block';
        } else {
            countrySelectionDiv.style.display = 'none';
            pieChartButton.style.display = 'none';
            if(myPieChart) {
                myPieChart.destroy();
                myPieChart = null;
            }
        }

        if (tabId === 'spreadsheet') {
            renderSpreadsheet();
            fetchCountries();
        } else if (tabId === 'pie-chart') {
            renderPieChart();
        }
    }

    function fetchCountries() {
        fetch(`/countries?dataset=${activeDatasetName}`)
            .then(response => response.json())
            .then(countries => {
                countrySelectionDiv.innerHTML = '';
                if (countries.length > 0) {
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
                            renderSpreadsheet();
                        });
                        countrySelectionDiv.appendChild(tile);
                    });
                } else {
                    countrySelectionDiv.innerHTML = '<p>No country filter available for this dataset.</p>';
                }
            });
    }

    function renderSpreadsheet() {
        const params = new URLSearchParams();
        params.append('dataset', activeDatasetName);
        if (selectedCountries.length > 0) {
            params.append('countries', selectedCountries.join(','));
        }

        fetch(`/data?${params.toString()}`)
            .then(response => response.json())
            .then(response => {
                const { headers, data } = response;
                tableHead.innerHTML = '';
                tableBody.innerHTML = '';

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
            while (parentRow.nextElementSibling && parentRow.nextElementSibling.dataset.level > parentRow.dataset.level) {
                parentRow.nextElementSibling.remove();
            }
            expander.textContent = '+';
        } else {
            const fragment = document.createDocumentFragment();
            renderRows(children, fragment, level + 1, headers);
            parentRow.after(fragment);
            expander.textContent = '-';
        }
    }

    function renderPieChart() {
        const ctx = document.getElementById('population-pie-chart').getContext('2d');
        if (myPieChart) {
            myPieChart.destroy();
        }

        const params = new URLSearchParams();
        params.append('dataset', activeDatasetName);
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

    fetchDatasets();
});