import requests
import boto3
import json

API_KEY="0MEKSff1SKt-5wsVgljGLljx-o_V8M8TtPQ9GpZIFmiXA3ZC9iFD9_4usUZ0JXsJcQYLPfKrwgNbFQ_ied69DtQwaA9Y_FD_yjZ8tzBwerJola1n9-4zI3Ik1PmTXXYx"


# API constants, you shouldn't have to change these.

API_HOST = 'https://api.yelp.com'
SEARCH_PATH = '/v3/businesses/search'
BUSINESS_PATH = '/v3/businesses/'  # Business ID will come after slash.
location = ['Brooklyn','Bronx']
term="restaurants"
headers = {'Authorization': 'Bearer %s' % API_KEY}

def suggest(location,off):
	params={"term":term,"location":"Manhattan","limit":50,"offset":off,"categories":"Indian,American"}
	return requests.get(API_HOST+SEARCH_PATH,params=params,headers=headers).json()["businesses"]

suggestions = suggest(location,50)
print(suggestions)

with open("cuisines-yelp.json", "w") as cuisines:
 	json.dump(suggestions, cuisines, indent=4,sort_keys=4)

# for j in location:
# 	for i in range 


