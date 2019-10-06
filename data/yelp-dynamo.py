from __future__ import print_function  # Python 2/3 compatibility
import boto3
import json
import decimal

dynamodb = boto3.resource('dynamodb', region_name='us-east-1',
                          endpoint_url="http://dynamodb.us-east-1.amazonaws.com")

table = dynamodb.Table('Reeco')

with open("cuisines-yelp.json") as json_file:
    restaurants = json.load(json_file, parse_float=decimal.Decimal)
    for restaurant in restaurants:
        alias = restaurant['alias']
        categories = restaurant['categories']
        coordinates = restaurant['coordinates']
        display_phone = restaurant['display_phone']
        distance = restaurant['distance']
        id = restaurant['id']
        image_url = restaurant['image_url']
        is_closed = restaurant['is_closed']
        location = restaurant['location']
        name = restaurant['name']
        phone = restaurant['phone']
        # price = restaurant['price']
        rating = restaurant['rating']
        review_count = restaurant['review_count']
        transactions = restaurant['transactions']
        url = restaurant['url']

        # print("Adding movie:", year, title)

        table.put_item(
            Item={
                'id': id,
                'name': name,
                'phone': phone,
                # 'price': price,
                'rating': rating,
                'alias': alias,
                'categories': categories,
                'coordinates': coordinates,
                'display_phone': display_phone,
                'distance': distance,
                'image_url': image_url,
                'is_closed': is_closed,
                'location': location,
                'review_count': review_count,
                'transactions': transactions,
                'url': url
            }
        )
