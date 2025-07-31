# Architecture

This project follows a simple monolithic architecture.

- **`app.py`**: The main application file containing the Flask web server. It includes a generalized function for processing tabular data and preparing it for the drill-down view.
- **`config/`**: Contains JSON configuration files that define the data source, drill-down structure, and display columns.
- **`templates/`**: Houses the HTML templates for the user interface.
- **`static/`**: Contains static assets such as CSS stylesheets, JavaScript files, and images.
- **`data/`**: Stores the data used by the application.
