'use strict';

var AWS = require('aws-sdk')

const getRestaurantIdsByCuisine = (cuisines) => {
    return new Promise((resolve, reject) => {
        // the promise will fetch the data from elasticsearch and will return the restaurant ids for the 
        // specific cuisine.
        // TODO: write code to fetch data from elasticsearch

        let data = {
            "Indian": ["1", "2", "3", "4"],
            "Mexican": ["5", "6", "7"]
        }

        resolve(data)
    })
}

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
        }
        resolve(data);
    })
}

const recommendRestaurantsToUsers = (users, cuisineToRestaurantsMapping, restaurantsInfo) => {
    return new Promise((resolve, reject) => {
        let cuisineRestaurantsMapping = {}
        Object.keys(cuisineToRestaurantsMapping).forEach(cuisine => {
            if (!cuisineRestaurantsMapping[cuisine]) {
                cuisineRestaurantsMapping[cuisine] = []
            }
            let restaurantIds = cuisineToRestaurantsMapping[cuisine]
            restaurantIds.forEach(id => {
                cuisineRestaurantsMapping[cuisine].push(restaurantsInfo[id])
            })
        })

        for (let i = 0; i < users.length; i++) {
            users[i].restaurants = cuisineRestaurantsMapping[users[i].cuisine]
        }

        resolve(users)
    })
}

const generateMessage = (user) => {
    let message = `Hello! Here are my ${user.cuisine} restaurant suggestions for ${user.people} people, for ${user.date} at ${user.time} hrs. `

    user.restaurants.forEach((restaurant, index) => {
        message += ` ${index + 1}. ${restaurant.name}, located at ${restaurant.address}, ${restaurant.zipcode}.`
    })

    message += " Enjoy your meal!";
    console.log(`Message generated for user ${user.phone}=`, message)
    return message
}

exports.handler = (event, context, callback) => {
    console.log("Event received in LF2")
    console.log(event)
    const records = event.Records
    console.log("Number of records: " + records.length)
    let cuisines = new Set(),
        users = [],
        cuisineToRestaurantsMapping = {},
        restaurantsInfo = {}

    records.forEach(record => {
        let userQueries = JSON.parse(record.body)

        if (userQueries.Phone && userQueries.Cuisine && userQueries.People && userQueries.Date && userQueries.Time) {
            cuisines.add(userQueries.Cuisine)
            let user = {
                "phone": userQueries.Phone,
                "cuisine": userQueries.Cuisine,
                "people": userQueries.People,
                "date": userQueries.Date,
                "time": userQueries.Time,
                "location": userQueries.Location,
                "restaurants": []
            }
            users.push(user)
        }
    });

    getRestaurantIdsByCuisine(cuisines)
        .then(data => {
            cuisineToRestaurantsMapping = data
            let restaurantIds = new Set()
            Object.values(data).forEach(ids => {
                ids.forEach(id => {
                    restaurantIds.add(id);
                })
            })

            return getRestaurantDetailsByIds(restaurantIds)
        })
        .then(data => {
            restaurantsInfo = data;
            return recommendRestaurantsToUsers(users, cuisineToRestaurantsMapping, restaurantsInfo)
        })
        .then(data => {
            let snsPromises = []
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

                console.log("params sent to SNS =", params)

                let promise = new AWS.SNS({ apiVersion: '2010-03-31' }).publish(params).promise();
                snsPromises.push(promise)
            })

            return Promise.all(snsPromises)
        })
        .then(data => {
            data.forEach((snsEvent => {
                console.log("message sent =", JSON.stringify({ MessageID: data.MessageId }));
            }))
        })
        .catch(err => {
            console.log("err sending message =", JSON.stringify({ Error: err }));
        })

    return {}
};