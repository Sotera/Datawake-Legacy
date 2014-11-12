from google import GoogleAuthentication
from mock import MockAuthentication
from datawake.conf.datawakeconfig import MOCK_AUTH

def get_authentication_object(token):
    if MOCK_AUTH:
        return MockAuthentication(token)
    else:
        return GoogleAuthentication(token)