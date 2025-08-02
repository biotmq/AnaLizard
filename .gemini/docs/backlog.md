### Create dummy sales data:
We need a program for creating a mountain of dummy data.
We need three set of data namely sell_in, sell_out, and inventory
All the data have the following fields
Region
Country
Manager
Distributor
Distributor_Group
Product_Category, Month, Year, Value, Count

We should create data for 2023, 2024, and up until now in 2025

We have a configuration for creating a Salience Score - I don't yet know how it should work

We need a spreadsheet configuration type that creates a merge of a list of other csv files. I.e. we can have all data for sell in, sell out, and inventory in one file. Renaming of the relevant columns.

A spread sheet can be denominated 'main' and will then be subject for preload filter, left hand column filters, sorting, and not least charts and drill downs.

Preload filter configurable in top of screen: Top 22 of distributors by sell in. 22 can be entered. 'distributors by sell in' could be any combination like 'country by inventory' and so on. The selection can only be from the main spreadsheet.

The filters in the Left column should be configurable as a list of fields. 

Mutation spreadsheets can be made fomr the main spreadsheet where the order of the drill down are different even with less levels.

For the columns we need a sort ascending and decending although respecting hierarchy so African Countries are not showing up in Asia i.e.
