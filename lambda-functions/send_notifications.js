'use strict';

let AWS = require('aws-sdk');
AWS.config.region = "us-east-1";
let region = 'us-east-1';
let domain = 'search-reeco-6uqlqkoo5s2zrbgplboq5shdtq.us-east-1.es.amazonaws.com';
let sqsURL ="https://sqs.us-east-1.amazonaws.com/655546244197/SQSQueue";

const getRestaurantIdsByCuisine = (cuisines) => {
    return new Promise((resolve, reject) => {
        let cuisines_arr = Array.from(cuisines);
        let endpoint = new AWS.Endpoint(domain);
        let request = new AWS.HttpRequest(endpoint, region);
        request.method = 'POST';
        request.headers['Content-Type'] = 'application/json';
        let cuisines_query = cuisines_arr.join(" or ");
        request.path += "restaurant/_search";
        let requestObj = buildRequest(cuisines_query);
        let client = new AWS.HttpClient();
        request.body = requestObj;

        let promise = new Promise((resolve, reject) => {
            client.handleRequest(request, null, function (response) {
                console.log(response.statusCode + ' ' + response.statusMessage);
                var responseBody = '';
                response.on('data', function (chunk) {
                    responseBody += chunk;
                });
                response.on('end', function (chunk) {
                    console.log('Response body: ' + responseBody);
                    resolve(responseBody);
                });

            }, function (error) {
                console.log('Error: ' + error);
                reject(error);
            });
        });

        promise.then((data) => {
            console.log("data received from ES ====", data);
            let extracted_data = extract_data(data);
            if (extracted_data == null) {
                let err = new Error("No hits in elastic search");
                console.log("No hits", err);
                reject(err);
            }
            resolve(extracted_data);
        })
            .catch(err => {
                console.log("error received from ES =========", err);
                reject(err);
            });
    });
};

const extract_data = (data) => {
    let hits = JSON.parse(data).hits.hits;
    if (hits.length === 0) {
        console.log("No hits");
        return null;
    }
    let rest_map = {};
    let one_hit;
    for (one_hit of hits.values()) {
        let source = one_hit._source;
        rest_map[source.cuisine] = source.restaurant;
    }
    return rest_map;
};

const buildRequest = (cuisines_query) => {
    let o = {};
    let key = "query";
    let data = {
        default_field: "cuisine",
        query: cuisines_query
    };
    o[key] = { query_string: data };
    return JSON.stringify(o);
};
const buildKeys = (restaurantIds) => {
    let id;
    let keys = [];
    for (id of restaurantIds.values()) {
        keys.push({ "id": { S: id } });
    }
    return keys;
};

const extract_dynamo = (data) => {
    let record;
    let dynamo_data = {};
    let yelp_restaurants = data.Responses["yelp-restaurants"];
    for (record of yelp_restaurants.values()) {
        dynamo_data[record.id.S] = { "name": record.name.S, "address": record.address.S, "zipcode": record.zip_code.S };
    }
    return dynamo_data;
};

const getRestaurantDetailsByIds = (restaurantIds) => {
    return new Promise((resolve, reject) => {
        // fetches restaurant details from dynamodb for each restaurant Ids
        let dynamodb = new AWS.DynamoDB({ maxRetries: 5, retryDelayOptions: { base: 300 } });
        let keys = buildKeys(restaurantIds);
        let params = {
            "RequestItems": {
                "yelp-restaurants": {
                    "Keys": keys,
                    "AttributesToGet": [
                        'id',
                        'name',
                        'address',
                        'zip_code'
                    ],
                }
            },
            "ReturnConsumedCapacity": "TOTAL"
        };

        let promise = new Promise((resolve, reject) => {
            dynamodb.batchGetItem(params, function (err, data) {
                if (err) {
                    console.error("Unable to get item. Error JSON:", JSON.stringify(err,
                        null, 2));
                    reject(err)
                } else {
                    console.log("Restaurant data:", JSON.stringify(data, null, 2));
                    resolve(data)
                }
            });
        });

        promise.then((data) => {
            console.log("data received from Dynamo ====", JSON.stringify(data));
            let dynamo_data = extract_dynamo(data);
            if (dynamo_data == null) {
                let err = new Error("No results in dynamo");
                console.log("No Records in dynamo ", err);
                reject(err);
            }
            resolve(dynamo_data);
        })
            .catch(err => {
                console.log("error received from Dynamo =========", err);
                reject(err);
            });
    });
};

const recommendRestaurantsToUsers = (users, cuisineToRestaurantsMapping, restaurantsInfo) => {
    console.log("Users:" + JSON.stringify(users));
    console.log("cuisineToRestaurantsMapping:" + JSON.stringify(cuisineToRestaurantsMapping));
    console.log("restaurantsInfo:" + JSON.stringify(restaurantsInfo));
    return new Promise((resolve, reject) => {
        let cuisineRestaurantsMapping = {};
        Object.keys(cuisineToRestaurantsMapping).forEach(cuisine => {
            if (!cuisineRestaurantsMapping[cuisine]) {
                cuisineRestaurantsMapping[cuisine] = [];
            }
            let restaurantIds = cuisineToRestaurantsMapping[cuisine];
            restaurantIds.forEach(id => {
                cuisineRestaurantsMapping[cuisine].push(restaurantsInfo[id]);
            });
        });

        for (let i = 0; i < users.length; i++) {
            let restaurantIds = cuisineRestaurantsMapping[users[i].cuisine];
            users[i].restaurants = restaurantIds ? restaurantIds : [];
        }

        resolve(users);
    });
};

const generateMessage = (user) => {

    if (user.restaurants.length == 0) {
        return `Hello! We are not able to find suitable restaurants for the cuisine ${user.cuisine}.`;
    }

    let message = `Hello! Here are my ${user.cuisine} restaurant suggestions for ${user.people} people, for ${user.date} at ${user.time} hrs. `;

    user.restaurants.forEach((restaurant, index) => {
        message += ` ${index + 1}. ${restaurant.name}, located at ${restaurant.address}, ${restaurant.zipcode}.`;
    });

    message += " Enjoy your meal!";
    console.log(`Message generated for user ${user.phone}=`, message);
    return message;
};

exports.handler = (event, context, callback) => {
    console.log("Event received in LF2");
    console.log(event);
    // const records = event.Records;
    // console.log("Number of records: " + records.length);
    let sqs = new AWS.SQS({apiVersion: '2012-11-05'});

    var params = {
     AttributeNames: [
        "SentTimestamp"
     ],
     MaxNumberOfMessages: 10,
     MessageAttributeNames: [
        "All"
     ],
     QueueUrl: sqsURL,
     VisibilityTimeout: 20,
     WaitTimeSeconds: 0
    };

    let sqsPromise = new Promise((resolve, reject)=>{
        sqs.receiveMessage(params, function(err, data) {
          if (err) {
            console.log("Receive Error", err);
            reject(err);
          } else if (data.Messages) {
            console.log("Message received from SQS =====================", data.Messages)
            let records = data.Messages
            let deleteAllpromises = []
            records.forEach(record=>{
                var deleteParams = {
                  QueueUrl: sqsURL,
                  ReceiptHandle: record.ReceiptHandle
                };
                let deletePromise = sqs.deleteMessage(deleteParams, function(err, data) {
                  if (err) {
                    console.log("Delete Error", err);
                  } else {
                    console.log("Message Deleted", data);
                  }
                });
                deleteAllpromises.push(deletePromise);
            })

            Promise.all(deleteAllpromises)
            .then(data=>{
                resolve(records)
            })
            .catch(err=>{
                reject(err);
            })
          }
        });
    })
    let cuisines = new Set(),
        users = [],
        cuisineToRestaurantsMapping = {},
        restaurantsInfo = {};
    sqsPromise.then(records=>{
        console.log("records======", records)
        records.forEach(record => {
            let userQueries = JSON.parse(record.Body);
            console.log("userQueries=========", userQueries)
            if (userQueries.phone && userQueries.cuisine && userQueries.people && userQueries.date && userQueries.time && userQueries.location) {
                cuisines.add(userQueries.cuisine);
                let user = {
                    "phone": userQueries.phone,
                    "cuisine": userQueries.cuisine,
                    "people": userQueries.people,
                    "date": userQueries.date,
                    "time": userQueries.time,
                    "location": userQueries.location,
                    "restaurants": []
                };
                users.push(user);
            }
        });

        return getRestaurantIdsByCuisine(cuisines)
    })
        .then(data => {
            cuisineToRestaurantsMapping = data;
            console.log("cuisineToRestaurantsMapping======", cuisineToRestaurantsMapping)
            let restaurantIds = new Set();
            Object.values(data).forEach(ids => {
                ids.forEach(id => {
                    restaurantIds.add(id);
                });
            });

            return getRestaurantDetailsByIds(restaurantIds);
        })
        .then(data => {
            restaurantsInfo = data;
            console.log("restaurantsInfo=========", restaurantsInfo)
            return recommendRestaurantsToUsers(users, cuisineToRestaurantsMapping, restaurantsInfo);
        })
        .then(data => {
            let snsPromises = [];
            data.forEach(user => {
                let params = {
                    Message: generateMessage(user),
                    PhoneNumber: user.phone,
                    MessageAttributes: {
                        'AWS.SNS.SMS.SenderID': {
                            'DataType': 'String',
                            'StringValue': 'reeco'
                        }
                    }
                };

                console.log("params sent to SNS =", params);

                let promise = new AWS.SNS({ apiVersion: '2010-03-31' }).publish(params).promise();
                snsPromises.push(promise);
            });

            return Promise.all(snsPromises);
        })
        .then(data => {
            data.forEach((snsEvent => {
                console.log("message sent =", JSON.stringify({ MessageID: data.MessageId }));
            }));
        })
        .catch(err => {
            console.log("err sending message =", JSON.stringify({ Error: err }));
        });

    return {};
};