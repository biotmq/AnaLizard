import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Configuration
regions = ['APAC', 'EMEA', 'NA', 'SA']
countries = {
    'APAC': ['China', 'Japan', 'India'],
    'EMEA': ['Germany', 'UK', 'France'],
    'NA': ['USA', 'Canada', 'Mexico'],
    'SA': ['Brazil', 'Argentina', 'Colombia']
}
managers = ['Alice', 'Bob', 'Charlie', 'David']
distributors = ['Distributor A', 'Distributor B', 'Distributor C', 'Distributor D']
distributor_groups = ['Group 1', 'Group 2']
product_categories = ['Category 1', 'Category 2', 'Category 3']

start_date = datetime(2023, 1, 1)
end_date = datetime.now()

def generate_data(file_name, value_range, count_range):
    data = []
    current_date = start_date
    while current_date <= end_date:
        for region in regions:
            for country in countries[region]:
                for manager in managers:
                    for distributor in distributors:
                        for distributor_group in distributor_groups:
                            for product_category in product_categories:
                                data.append({
                                    'Region': region,
                                    'Country': country,
                                    'Manager': manager,
                                    'Distributor': distributor,
                                    'Distributor_Group': distributor_group,
                                    'Product_Category': product_category,
                                    'Month': current_date.month,
                                    'Year': current_date.year,
                                    'Value': np.random.randint(*value_range),
                                    'Count': np.random.randint(*count_range)
                                })
        current_date += timedelta(days=32)
        current_date = current_date.replace(day=1)

    df = pd.DataFrame(data)
    df.to_csv(f'data/{file_name}.csv', index=False)
    print(f"Generated {file_name}.csv with {len(df)} rows.")

def generate_merged_sales_data():
    sell_in_df = pd.read_csv('data/sell_in.csv').rename(columns={'Value': 'sell_in_value', 'Count': 'sell_in_count'})
    sell_out_df = pd.read_csv('data/sell_out.csv').rename(columns={'Value': 'sell_out_value', 'Count': 'sell_out_count'})
    inventory_df = pd.read_csv('data/inventory.csv').rename(columns={'Value': 'inventory_value', 'Count': 'inventory_count'})

    merge_cols = ['Region', 'Country', 'Manager', 'Distributor', 'Distributor_Group', 'Product_Category', 'Month', 'Year']
    merged_df = pd.merge(sell_in_df, sell_out_df, on=merge_cols, how='outer')
    merged_df = pd.merge(merged_df, inventory_df, on=merge_cols, how='outer')
    merged_df.to_csv('data/sales.csv', index=False)
    print(f"Generated sales.csv with {len(merged_df)} rows.")

if __name__ == '__main__':
    generate_data('sell_in', (1000, 5000), (100, 500))
    generate_data('sell_out', (800, 4000), (80, 400))
    generate_data('inventory', (200, 1000), (20, 100))
    generate_merged_sales_data()