from datetime import datetime, date
import logging
import os
import time

import dateutil.parser
import phonenumbers

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)


def elicit_slot(session_attributes, intent_name, slots, slot_to_elicit, message):
    return {
        'sessionAttributes': session_attributes,
        'dialogAction': {
            'type': 'ElicitSlot',
            'intentName': intent_name,
            'slots': slots,
            'slotToElicit': slot_to_elicit,
            'message': message
        }
    }


def safe_int(n):
    """
    Safely convert n value to int.
    """
    if n is not None:
        return int(n)
    return n


def try_ex(func):
    """
    Call passed in function in try block. If KeyError is encountered return None.
    This function is intended to be used to safely access dictionary.

    Note that this function would have negative impact on performance.
    """

    try:
        return func()
    except KeyError:
        return None


def close(session_attributes, fulfillment_state, message):
    response = {
        'sessionAttributes': session_attributes,
        'dialogAction': {
            'type': 'Close',
            'fulfillmentState': fulfillment_state,
            'message': message
        }
    }

    return response


def delegate(session_attributes, slots):
    return {
        'sessionAttributes': session_attributes,
        'dialogAction': {
            'type': 'Delegate',
            'slots': slots
        }
    }


def isvalid_date(date):
    try:
        dateutil.parser.parse(date)
        return True
    except ValueError:
        return False


def isvalid_time(input_time):
    return len(input_time) == 5 and len(input_time.split(":")) == 2 and len(input_time.split(":")[0]) == 2


def isvalid_city(city):
    valid_cities = ['new york', 'los angeles', 'chicago', 'houston', 'philadelphia', 'phoenix', 'san antonio',
                    'san diego', 'dallas', 'san jose', 'austin', 'jacksonville', 'san francisco', 'indianapolis',
                    'columbus', 'fort worth', 'charlotte', 'detroit', 'el paso', 'seattle', 'denver', 'washington dc',
                    'memphis', 'boston', 'nashville', 'baltimore', 'portland']
    return city.lower() in valid_cities


def isvalid_cuisine(cuisine):
    return True


def build_validation_result(isvalid, violated_slot, message_content):
    return {
        'isValid': isvalid,
        'violatedSlot': violated_slot,
        'message': {'contentType': 'PlainText', 'content': message_content}
    }


def get_day_difference(later_date, earlier_date):
    later_datetime = dateutil.parser.parse(later_date).date()
    earlier_datetime = dateutil.parser.parse(earlier_date).date()
    return abs(later_datetime - earlier_datetime).days


def isvalid_people(people):
    people = safe_int(people)
    if not people or people < 1:
        return False
    return True


def isvalid_phone(phone):
    if not phonenumbers.PhoneNumberMatcher(phone, "US"):
        return False
    return True


def validate_info(slots):
    location = try_ex(lambda: slots['Location'])
    input_date = try_ex(lambda: slots['Date'])
    reserve_time = try_ex(lambda: slots['Time'])
    cuisine = try_ex(lambda: slots['Cuisine'])
    people = safe_int(try_ex(lambda: slots['People']))
    phone = try_ex(lambda: slots['Phone'])

    if location and not isvalid_city(location):
        return build_validation_result(
            False,
            'Location',
            'We currently do not support {} as a valid destination.  Can you try a different city?'.format(location)
        )

    if input_date:
        if not isvalid_date(input_date):
            return build_validation_result(False, 'Date',
                                           'I did not understand what date you want to reserve.  When would you like '
                                           'to reserve a table?')
        if datetime.strptime(input_date, '%Y-%m-%d').date() < date.today():
            return build_validation_result(False, 'Date',
                                           'Reservations must be scheduled for future only.  Can you try a different '
                                           'date?')
    if reserve_time:
        if not isvalid_time(reserve_time):
            return build_validation_result(False, 'Time',
                                           'I did not understand what time you\'re looking for.  When would you like '
                                           'to reserve a table?')
        hour = int(reserve_time.split(":")[0])
        minute = int(reserve_time.split(":")[1])
        input_date = datetime.strptime(input_date, "%Y-%m-%d").replace(hour=hour, minute=minute)
        if input_date < datetime.now():
            return build_validation_result(False, 'Time',
                                           'Reservations must be scheduled for future only.  Can you try a different '
                                           'time?')
    if cuisine:
        if not isvalid_cuisine(cuisine):
            return build_validation_result(False, 'Cuisine',
                                           'I did not understand the cuisine. Can you try a different cuisine?')

    if people:
        if not isvalid_people(people):
            return build_validation_result(False, 'People',
                                           'The number of people should be greater than or equal to one. Please enter '
                                           'a valid number of people')

    if phone:
        if not isvalid_phone(phone):
            return build_validation_result(False, 'Phone',
                                           'The phone number you\'ve entered is invalid. Please enter a valid United '
                                           'states number only')

    return {'isValid': True}


def format_and_send_to_sqs(location, input_date, reserve_time, cuisine, people, phone):
    pass


def suggest_restaurants(intent_request):
    # Validate any slots which have been specified.  If any are invalid, re-elicit for their value
    slots = intent_request['currentIntent']['slots']
    validation_result = validate_info(slots)
    if not validation_result['isValid']:
        slots = intent_request['currentIntent']['slots']
        slots[validation_result['violatedSlot']] = None

        return elicit_slot(
            {},
            intent_request['currentIntent']['name'],
            slots,
            validation_result['violatedSlot'],
            validation_result['message']
        )
    location = try_ex(lambda: slots['Location'])
    input_date = try_ex(lambda: slots['Date'])
    reserve_time = try_ex(lambda: slots['Time'])
    cuisine = try_ex(lambda: slots['Cuisine'])
    people = safe_int(try_ex(lambda: slots['People']))
    phone = try_ex(lambda: slots['Phone'])
    if location and input_date and reserve_time and cuisine and people and phone:
        format_and_send_to_sqs(location, input_date, reserve_time, cuisine, people, phone)
        return close(
            {},
            'Fulfilled',
            {
                'contentType': 'PlainText',
                'content': 'Ok, I will send you a text containing all information about restaurants based on your '
                           'preferences. '
            }
        )
    else:
        return delegate({}, slots)


def greet(intent_request):
    return close(
        {},
        'Fulfilled',
        {
            'contentType': 'PlainText',
            'content': 'Hi. How can I help you?'
        }
    )


def thank(intent_request):
    return close(
        {},
        'Fulfilled',
        {
            'contentType': 'PlainText',
            'content': 'You\'re welcome'
        }
    )


def dispatch(intent_request):
    """
    Called when the user specifies an intent for this bot.
    """

    logger.debug(
        'dispatch userId={}, intentName={}'.format(intent_request['userId'], intent_request['currentIntent']['name']))

    intent_name = intent_request['currentIntent']['name']

    # Dispatch to your bot's intent handlers
    if intent_name == 'DiningSuggestionsIntent':
        return suggest_restaurants(intent_request)
    elif intent_name == 'GreetingIntent':
        return greet(intent_request)
    elif intent_name == 'ThankYouIntent':
        return thank(intent_request)
    raise Exception('Intent with name ' + intent_name + ' not supported')


def lambda_handler(event, context):
    """
    Route the incoming request based on intent.
    The JSON body of the request is provided in the event slot.
    """
    # By default, treat the user request as coming from the America/New_York time zone.
    os.environ['TZ'] = 'America/New_York'
    time.tzset()
    logger.debug('event.bot.name={}'.format(event['bot']['name']))

    return dispatch(event)
