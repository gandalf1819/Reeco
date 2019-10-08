import boto3
import requests
from requests_aws4auth import AWS4Auth
import json
import decimal

def send_signed(method, url, service='es', region='us-east-1', body=None):
    #print(body)

    credentials = boto3.Session().get_credentials()
    auth = AWS4Auth(credentials.access_key, credentials.secret_key,
                  region, service, session_token=credentials.token)

    fn = getattr(requests, method)
    if body and not body.endswith("\n"):
        body += "\n"
    fn(url, auth=auth, data=body,
       headers={"Content-Type":"application/json"})


url = 'https://search-reeco-project-izzkmx2wslcqqwmen6g4xgmywq.us-east-1.es.amazonaws.com/restaurant/restaurants'
with open("cuisines-yelp.json") as json_file:
    restaurants = json.load(json_file)
    for restaurant in restaurants:
        send_signed('post', url, body=json.dumps(restaurant))