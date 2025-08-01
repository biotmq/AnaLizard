from flask import Flask, render_template, jsonify, request
import pandas as pd
import json
import os

app = Flask(__name__)

def create_nested_structure(df, drill_down_fields, sum_columns, calculated_columns, label_columns):
    data = []
    if not drill_down_fields:
        for index, row in df.iterrows():
            item = {}
            for col in df.columns:
                item[col] = row[col]
            if df.columns.any():
                item['name'] = row[df.columns[0]]
            data.append(item)
        return data

    current_field = drill_down_fields[0]
    remaining_fields = drill_down_fields[1:]

    for group_name, group_df in df.groupby(current_field):
        group_dict = {'name': group_name}
        for col in sum_columns:
            group_dict[col] = group_df[col].sum().item()
        for col in label_columns:
            if col in group_df.columns:
                group_dict[col] = group_df[col].iloc[0]

        for calc in calculated_columns:
            if calc['calculation'] == 'percentage':
                num = group_df[calc['numerator']].sum()
                den = group_df[calc['denominator']].sum()
                group_dict[calc['name']] = (num / den) * 100 if den else 0

        if remaining_fields:
            group_dict['children'] = create_nested_structure(group_df, remaining_fields, sum_columns, calculated_columns, label_columns)
        else:
            group_dict['children'] = group_df.to_dict(orient='records')
            if not group_df.empty and group_df.columns.any():
                name_col = group_df.columns[0]
                for child in group_dict['children']:
                    child['name'] = child.get(name_col, '')

        data.append(group_dict)
    return data

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/datasets')
def get_datasets():
    with open('config/app_config.json') as f:
        config = json.load(f)
    sorted_datasets = sorted(config['datasets'], key=lambda x: x.get('order', float('inf')))
    return jsonify(sorted_datasets)

@app.route('/data')
def get_data():
    dataset_name = request.args.get('dataset')

    with open('config/app_config.json') as f:
        app_config = json.load(f)

    dataset_config = next((item for item in app_config['datasets'] if item["name"] == dataset_name), None)

    if not dataset_config:
        return jsonify({"error": "Dataset not found"}), 404

    config_path = dataset_config.get('config_path')

    if config_path and os.path.exists(config_path):
        with open(config_path) as f:
            config = json.load(f)
    else:
        df = pd.read_csv(dataset_config['csv_path'])
        config = {
            "csv_path": dataset_config['csv_path'],
            "drill_down_fields": [],
            "sum_columns": [],
            "label_columns": [],
            "calculated_columns": [],
            "display_columns": [{"name": col, "color": "GREY"} for col in df.columns]
        }

    df = pd.read_csv(config['csv_path'])

    countries = request.args.get('countries')
    if countries and 'Nation' in df.columns:
        countries_list = countries.split(',')
        df = df[df['Nation'].isin(countries_list)]

    for calc in config.get('calculated_columns', []):
        if calc['calculation'] == 'percentage':
            df[calc['name']] = (df[calc['numerator']] / df[calc['denominator']]) * 100

    if not config.get('drill_down_fields'):
         data = df.to_dict(orient='records')
         if data and df.columns.any():
             name_col = df.columns[0]
             for row in data:
                 row['name'] = row[name_col]
    else:
        data = create_nested_structure(df, config.get('drill_down_fields', []), config.get('sum_columns', []), config.get('calculated_columns', []), config.get('label_columns', []))

    headers = config['display_columns']

    return jsonify({'headers': headers, 'data': data})


@app.route('/countries')
def get_countries():
    dataset_name = request.args.get('dataset')
    if dataset_name != 'Population':
        return jsonify([])

    with open('config/population.json') as f:
        config = json.load(f)
    df = pd.read_csv(config['csv_path'])
    countries = df['Nation'].unique().tolist()
    return jsonify(countries)

@app.route('/pie_chart_data')
def get_pie_chart_data():
    dataset_name = request.args.get('dataset')
    if dataset_name != 'Population':
        return jsonify([])

    with open('config/population.json') as f:
        config = json.load(f)
    df = pd.read_csv(config['csv_path'])

    countries = request.args.get('countries')
    if countries:
        countries_list = countries.split(',')
        df = df[df['Nation'].isin(countries_list)]

    continent_population = df.groupby('Continent')['People'].sum().reset_index()
    data = [{'continent': row['Continent'], 'population': row['People']} for index, row in continent_population.iterrows()]
    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True)