"""

Copyright 2014 Sotera Defense Solutions, Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

"""


from datawaketools.kafka_consumer import KafkaConsumer
from datawaketools import datawakeconfig
from extract_phonenumber import ExtractPhoneNumber
from extract_website import ExtractWebsite
from extract_email import ExtractEmail
import datawaketools.entity_data_connector_factory as factory

import urllib2
import traceback
import sys
import time
from datetime import datetime
import time

entityDataConnector = factory.getEntityDataConnector()

VISIT_COUNTS = {}
MAX_SIZE = 1000



def checkCache(url):
    global VISIT_COUNTS

    seen = False
    if url not in VISIT_COUNTS:
        VISIT_COUNTS[url] = 1
    else:
        VISIT_COUNTS[url] += 1
        seen = True

    # if greater than max size remove the least recently used half
    if len(VISIT_COUNTS) > MAX_SIZE:
        items = VISIT_COUNTS.items()
        items.sort(reverse=True,key=lambda x: x[1])
        items = items[:MAX_SIZE/2]
        VISIT_COUNTS=dict(items)
        print '\nCACHED REACHED MAX SIZE, DUMPED LEAST RECENTLY USED HALF\n'

    return seen






def checkDoamin(domain,type,entities):
    if len(entities) == 0:
        return []
    start = datetime.now()
    hits = entityDataConnector.get_domain_entity_matches(domain,type,entities)
    end = datetime.now()
    duration = str(end-start)
    print '\tdomain hits: ',len(hits),' ',duration
    return hits





def extract(type,extractor,url,html,org,domain):
    values = extractor.test(html)
    values = map(lambda x: x.replace(',', ' ').strip(),values)

    if len(values) == 0:
        return
    else:
        print '\t',type,': ',len(values)

    entityDataConnector.insertEntities(url, type, values)

    hits = checkDoamin(domain,type,values)
    if len(hits) > 0: entityDataConnector.insertDomainEntities(domain,url, type, hits)








if __name__ == '__main__':
    print 'tailing kafka queue at ',datawakeconfig.KAFKA_CONN_POOL,' topic: ',datawakeconfig.KAFKA_LOOKAHEAD_TOPIC


    extractEmail = ExtractEmail()
    extractPhone = ExtractPhoneNumber()
    extractWebsite = ExtractWebsite()

    consumer = None
    while True:
        sys.stdout.flush()
        try:
            if consumer is None:
                consumer = KafkaConsumer(datawakeconfig.KAFKA_CONN_POOL,datawakeconfig.KAFKA_LOOKAHEAD_TOPIC,'python-lookahead-consumer')
            print 'waiting for message...'
            message = consumer.next()
            (timestamp,org,domain,url) = message.split('\0')

            if '.google.com' in url:
                continue
            if 'http' not in url:
                url = 'http://'+url
            if not checkCache(url):
                print 'NEW URL:'
                print '\tTIMESTAMP: ',timestamp
                print '\tURL: ',url


                #last_ts = entityDataConnector.getLastLookaheadTimestamp(url)
                #if last_ts is not None and last_ts[1] < 36000:
                #    print '\t url visited less than one hour ago, not revisiting'
                #    continue
                #elif last_ts is not None:
                #    print '\t last see '+str(last_ts[1])+ 'mil-seconds ago, re checking'



                opener = urllib2.build_opener()
                headers = [("User-Agent", "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:12.0) Gecko/20100101 Firefox/12.0")]
                opener.addheaders = headers
                response = opener.open(url)
                time.sleep(.25)
                html = response.read()#.encode('ascii', 'ignore')

                # EMAILS
                extract('email',extractEmail,url,html,org,domain)

                # PHONES
                extract('phone',extractPhone,url,html,org,domain)

                # WEBSITES
                extract('website',extractWebsite,url,html,org,domain)


                entityDataConnector.close()

            else:
                print 'URL in Cache. Skipping lookup'
                print '\tURL: ',url


        except KeyboardInterrupt:
            print 'exiting for keyboard interrupt'
            entityDataConnector.close()
            sys.exit(1)
        except:
            print ''
            traceback.print_exc()
            print ''
            entityDataConnector.close()
            consumer = None
            print ' waiting 10 seconds before trying to reconnect'
            time.sleep(10)
            continue







