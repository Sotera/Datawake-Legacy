import json
import time

import httplib2

from datawake.conf import datawakeconfig as constants
from user import User


"""
 Authenticates a user with google

 the auth request must come form a valid client ID registed with the google devopment console

 https://console.developers.google.com/project/apps~elevated-epoch-574/apiui/credential?authuser=0


"""

VALIDATE_TOKEN_URL = 'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=%s'
GET_PROFILE_URL = 'https://www.googleapis.com/plus/v1/people/%s?access_token=%s'
CLIENT_IDS = constants.CLIENT_IDS


#
# Validate token and return user id
#
def getUserFromToken(token, mock=False):
    (userId, clientId, expires) = validateToken(token, mock)
    user = getUserInfo(token, userId, mock)
    return user


#
# validate an access token
# if valid returns (userId,clientId,expires)
#  else raises a ValueError
#
def validateToken(token, mock=False):
    if constants.MOCK_AUTH or mock:
        return ('0', '0', int(time.time()) + 300)
    url = (VALIDATE_TOKEN_URL % token)
    h = httplib2.Http()
    result = json.loads(h.request(url, 'GET')[1])

    if result.get('error') is not None:
        raise ValueError("Invalid access token")

    clientId = result.get('audience')
    if clientId not in CLIENT_IDS:
        raise ValueError("Token granted to unknown client: " + clientId)

    userId = result.get('user_id')
    if userId is None:
        raise ValueError("userId not returned by token validation. Ensure the profile scope was present in the request to create the access token")

    expires = int(result.get('expires_in')) + int(time.time())
    return (userId, clientId, expires)


#
# returns the users google plus profile
#
def getProfile(token, userId, mock=False):
    if constants.MOCK_AUTH or mock:
        return {'displayName': 'John Doe', 'emails': [{'value': 'john.doe@nomail.none'}]}
    url = (GET_PROFILE_URL % (userId, token))
    h = httplib2.Http()
    result = json.loads(h.request(url, 'GET')[1])

    if result.get('error') is not None:
        raise ValueError("Invalid access token or userId")
    return result


#
# get the users display name from their profile
#
def getUserInfo(token, userId, mock=False):
    profile = getProfile(token, userId, mock)
    emails = profile.get('emails')
    email = ''
    if emails:
        email = emails[0]['value']
    user = User(profile.get('displayName'), userId, email)
    return user
