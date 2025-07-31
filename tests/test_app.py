import pytest
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_index(client):
    """Test the index page."""
    rv = client.get('/')
    assert rv.status_code == 200

def test_get_data(client):
    """Test the /data endpoint."""
    rv = client.get('/data')
    assert rv.status_code == 200
    json_data = rv.get_json()
    assert 'headers' in json_data
    assert 'data' in json_data

def test_get_countries(client):
    """Test the /countries endpoint."""
    rv = client.get('/countries')
    assert rv.status_code == 200
    json_data = rv.get_json()
    assert isinstance(json_data, list)

def test_get_pie_chart_data(client):
    """Test the /pie_chart_data endpoint."""
    rv = client.get('/pie_chart_data')
    assert rv.status_code == 200
    json_data = rv.get_json()
    assert isinstance(json_data, list)
    if json_data:
        assert 'continent' in json_data[0]
        assert 'population' in json_data[0]

def test_get_data_with_country_filter(client):
    """Test the /data endpoint with a country filter."""
    rv = client.get('/data?countries=USA')
    assert rv.status_code == 200
    json_data = rv.get_json()
    assert 'headers' in json_data
    assert 'data' in json_data
    # Check that the data is filtered to USA
    for continent in json_data['data']:
        for nation in continent['children']:
            assert nation['name'] == 'USA'