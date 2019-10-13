'use strict';

let AWS = require('aws-sdk');
AWS.config.region = "us-east-1";
let region = 'us-east-1';
let domain = 'search-reeco-6uqlqkoo5s2zrbgplboq5shdtq.us-east-1.es.amazonaws.com';

const getRestaurantIdsByCuisine = (cuisines) => {
    return new Promise((resolve, reject) => {
        console.log("Entered getRestaurantIdsByCuisine with cuisines: " + cuisines);
        let cuisines_arr = Array.from(cuisines);
        let endpoint = new AWS.Endpoint(domain);
        let request = new AWS.HttpRequest(endpoint, region);
        request.method = 'POST';
        request.headers['Content-Type'] = 'application/json';
        let cuisines_query = cuisines_arr.join(" or ");
        console.log("Cuisines query: " + cuisines_query);
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
                let err = new Error("No hits in elasticsearch");
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
    console.log(hits);
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
    console.log(rest_map);
    return rest_map;
};

const buildRequest = (cuisines_query) => {
    var o = {};
    var key = "query";
    var data = {
        default_field: "cuisine",
        query: cuisines_query
    };
    o[key] = {query_string: data};
    let jsonString = JSON.stringify(o);
    console.log("Query string: " + jsonString);
    return jsonString;
};

const getRestaurantDetailsByIds = (restaurantIds) => {
    return new Promise((resolve, reject) => {
        // fetches restaurant details from dynamodb for each restaurant Ids
        // TODO: write code to fetch data from dynamodb

        let data = {
            "1": {
                "name": "Indian restaurant 1",
                "address": "Manhattan address",
                "zipcode": "11201"
            },
            "2": {
                "name": "Indian restaurant 2",
                "address": "Manhattan address",
                "zipcode": "11202"
            },
            "3": {
                "name": "Indian restaurant 3",
                "address": "Manhattan address",
                "zipcode": "11203"
            },
            "4": {
                "name": "Indian restaurant 4",
                "address": "Manhattan address",
                "zipcode": "11204"
            },
            "5": {
                "name": "Mexican restaurant 5",
                "address": "Manhattan address",
                "zipcode": "11205"
            },
            "6": {
                "name": "Mexican restaurant 6",
                "address": "Manhattan address",
                "zipcode": "11205"
            },
            "7": {
                "name": "Mexican restaurant 7",
                "address": "Manhattan address",
                "zipcode": "11205"
            }
        };
        resolve(data);
    });
};

const recommendRestaurantsToUsers = (users, cuisineToRestaurantsMapping, restaurantsInfo) => {
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
            users[i].restaurants = cuisineRestaurantsMapping[users[i].cuisine];
        }

        resolve(users);
    });
};

const generateMessage = (user) => {
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
    const records = event.Records;
    console.log("Number of records: " + records.length);
    let cuisines = new Set(),
        users = [],
        cuisineToRestaurantsMapping = {},
        restaurantsInfo = {};

    records.forEach(record => {
        let userQueries = JSON.parse(record.body);
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
    console.log(cuisines);
    getRestaurantIdsByCuisine(cuisines)
        .then(data => {
            cuisineToRestaurantsMapping = data;
            console.log("Mappings received: " + JSON.stringify(cuisineToRestaurantsMapping));
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

                let promise = new AWS.SNS({apiVersion: '2010-03-31'}).publish(params).promise();
                snsPromises.push(promise);
            });

            return Promise.all(snsPromises);
        })
        .then(data => {
            data.forEach((snsEvent => {
                console.log("message sent =", JSON.stringify({MessageID: data.MessageId}));
            }));
        })
        .catch(err => {
            console.log("err sending message =", JSON.stringify({Error: err}));
        });

    return {};
};