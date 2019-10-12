from __future__ import print_function  # Python 2/3 compatibility
import boto3
import json
import decimal
import requests
from requests_aws4auth import AWS4Auth
from datetime import datetime

dynamodb = boto3.resource('dynamodb', region_name='us-east-1',
                          endpoint_url="http://dynamodb.us-east-1.amazonaws.com")

table = dynamodb.Table('yelp-restaurants')

def send_signed(method, url, service='es', region='us-east-1', body=None):
    # print(body)

    credentials = boto3.Session().get_credentials()
    auth = AWS4Auth(credentials.access_key, credentials.secret_key,
                  region, service, session_token=credentials.token)

    fn = getattr(requests, method)
    if body and not body.endswith("\n"):
        body += "\n"
    fn(url, auth=auth, data=body,
       headers={"Content-Type":"application/json"})

# ElasticSearch Endpoint
url = 'https://search-reeco-6uqlqkoo5s2zrbgplboq5shdtq.us-east-1.es.amazonaws.com/restaurant/restaurants'

new_dict = []
#  DynamoDB fields : Business ID, Name, Address, Coordinates, Number of Reviews, Rating, Zip Code
with open("cuisines-yelp.json") as json_file:
    restaurants = json.load(json_file, parse_float=decimal.Decimal)
    for restaurant in restaurants:
        alias = restaurant['alias']
        cuisine = restaurant["categories"][0]["alias"]
        latitude = restaurant["coordinates"]["latitude"]
        longitude = restaurant["coordinates"]["longitude"]
        id = restaurant['id']
        address = restaurant['location']['display_address'][0] + restaurant['location']['display_address'][1]
        name = restaurant['name']
        phone = restaurant['phone']
        rating = restaurant['rating']
        review_count = restaurant['review_count']
        zip_code = restaurant['location']['zip_code'] 

        # Add 'insertedAtTimestamp' for each record
        current_time = datetime.now()
        insertedAtTimestamp = current_time.strftime("%d/%m/%Y %H:%M:%S")

        table.put_item(
            Item = {
                'id': id,
                'name': name,
                'phone': phone,
                'rating': rating,
                'alias': alias,
                'cuisine': cuisine,
                'latitude': latitude,
                'longitude': longitude,
                'address': address,
                'review_count': review_count,
                'zip_code' : zip_code,
                'insertedAtTimestamp' : insertedAtTimestamp
        })

        # ELS alterations
        currentRest = {"id": restaurant["id"], "cuisine": restaurant["categories"]}
        cuisines = []
        for item in currentRest["cuisine"]:
            cuisines.append(item["title"])

        restaurants_els = {"id": restaurant["id"], "cuisine": cuisines, "name":restaurant["name"]}
        new_dict.append(dict(restaurants_els))

    # Get list of cuisines
    list_cuisines = []
    object_dict = []

    # Iterate through modified dictionary - new_dict
    for rest in new_dict:
        for item in rest["cuisine"]:
            if item not in list_cuisines:
                list_cuisines.append(item)

    # Get JSON format to ELS JSON format

    final_list = []
    keys = []

    for item in list_cuisines:
        restaurant_in_cuisine = []
        for restaurant in new_dict:
            if item in restaurant["cuisine"]:
                restaurant_in_cuisine.append(restaurant["id"])
    
        cuisine_dict = {"cuisine": item, "restaurant": restaurant_in_cuisine}
        final_list.append(cuisine_dict)

    for restaurant in final_list:
        send_signed('post', url, body=json.dumps(restaurant))
        