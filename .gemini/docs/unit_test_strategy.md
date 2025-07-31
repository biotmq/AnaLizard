# Unit Test Strategy

## Framework
- **Testing Framework:** `pytest` is recommended for its simplicity and powerful features.

## Test Location
- A `tests/` directory should be created in the project root.
- Test files should be named with a `test_` prefix (e.g., `test_app.py`).

## What to Test
- **Business Logic:** Test the functions in `app.py` that manipulate data or perform calculations, including the `create_nested_structure` function.
- **API Endpoints:** Test the Flask routes to ensure they return the expected responses and handle different request methods and query parameters correctly. This includes testing the `/data`, `/countries`, and `/pie_chart_data` endpoints.
- **Data Handling:** Test the code that reads and processes the data from the CSV files and the JSON configuration files.
- **Calculated Columns:** Test the logic for calculating new columns.
- **Country Filter:** Test the country filter functionality to ensure it correctly filters the data.