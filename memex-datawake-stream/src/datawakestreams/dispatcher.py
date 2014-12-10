from __future__ import absolute_import, print_function, unicode_literals
import json
import traceback
from streamparse.bolt import Bolt


class Dispatcher(Bolt):
"""
Works with the JVM kafka bolt to process incoming tuples from kafka
"""

    def process(self, tup):
        message = tup.values[0].split('\0')
        (timestamp, org, domain, userId, url, html) = message
        context = {
            'source': 'datawake-visited',
            'userId': userId,
            'org': org,
            'domain': domain,
            'url': url
        }
        self.emit([url, '', '', '', html, timestamp, context['source'], context])



