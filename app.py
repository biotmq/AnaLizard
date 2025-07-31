from flask import Flask, render_template, jsonify, request
import pandas as pd
import json

app = Flask(__name__)

def create_nested_structure(df, drill_down_fields, sum_columns, calculated_columns, label_columns):
    data = []
    if not drill_down_fields:
        for index, row in df.iterrows():
            item = {'name': row['Street']}
            for col in sum_columns + [c['name'] for c in calculated_columns] + label_columns:
                item[col] = row[col]
            data.append(item)
        return data

    current_field = drill_down_fields[0]
    remaining_fields = drill_down_fields[1:]

    for group_name, group_df in df.groupby(current_field):
        group_dict = {'name': group_name}
        for col in sum_columns:
            group_dict[col] = group_df[col].sum().item()
        for col in label_columns:
            group_dict[col] = group_df[col].iloc[0]
        
        for calc in calculated_columns:
            if calc['calculation'] == 'percentage':
                num = group_df[calc['numerator']].sum()
                den = group_df[calc['denominator']].sum()
                group_dict[calc['name']] = (num / den) * 100 if den else 0

        if remaining_fields:
            group_dict['children'] = create_nested_structure(group_df, remaining_fields, sum_columns, calculated_columns, label_columns)
        else:
            group_dict['children'] = []
            for index, row in group_df.iterrows():
                child = {'name': row['Street']}
                for col in sum_columns + [c['name'] for c in calculated_columns] + label_columns:
                    child[col] = row[col]
                group_dict['children'].append(child)
        data.append(group_dict)
    return data

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/data')
def get_data():
    config_name = request.args.get('config', 'population')
    with open(f'config/{config_name}.json') as f:
        config = json.load(f)

    df = pd.read_csv(config['csv_path'])

    countries = request.args.get('countries')
    if countries:
        countries_list = countries.split(',')
        df = df[df['Nation'].isin(countries_list)]

    for calc in config['calculated_columns']:
        if calc['calculation'] == 'percentage':
            df[calc['name']] = (df[calc['numerator']] / df[calc['denominator']]) * 100

    data = create_nested_structure(df, config['drill_down_fields'], config['sum_columns'], config['calculated_columns'], config['label_columns'])
    
    headers = config['display_columns']

    return jsonify({'headers': headers, 'data': data})

@app.route('/countries')
def get_countries():
    config_name = request.args.get('config', 'population')
    with open(f'config/{config_name}.json') as f:
        config = json.load(f)
    df = pd.read_csv(config['csv_path'])
    countries = df['Nation'].unique().tolist()
    return jsonify(countries)

@app.route('/pie_chart_data')
def get_pie_chart_data():
    config_name = request.args.get('config', 'population')
    with open(f'config/{config_name}.json') as f:
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
