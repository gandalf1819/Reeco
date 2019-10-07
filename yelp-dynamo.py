from __future__ import print_function # Python 2/3 compatibility
import boto3
import json
import decimal

dynamodb = boto3.resource('dynamodb', region_name='us-east-1', endpoint_url="http://dynamodb.us-east-1.amazonaws.com")

table = dynamodb.Table('Reeco')

with open("cuisines-yelp.json") as json_file:
    restaurants = json.load(json_file, parse_float = decimal.Decimal)
    for restaurant in restaurants:
        alias = restaurant['alias']
        categories = restaurant['categories']
        coordinates = restaurant['coordinates']
        display_phone = restaurant['display_phone']
        distance = restaurant['distance']
        id = restaurant['id']
        is_closed = restaurant['is_closed']
        location = restaurant['location']
        name = restaurant['name']
        phone = restaurant['phone']
        rating = restaurant['rating']
        review_count = restaurant['review_count']
        # transactions = restaurant['transactions']

        # print("Adding movie:", year, title)

        table.put_item(
           Item={
               'alias': alias,
               'categories': categories,
               'coordinates': coordinates,
               'display_phone': display_phone,
               'distance': distance,
               'id': id,
               'is_closed':is_closed,
               'location': location,
               'name': name,
               'phone': phone,
               'rating': rating,
               'review_count': review_count,
            }
        )