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

from datawaketools import datawakeconfig
from datawaketools.kafka_consumer import KafkaConsumer
from datawaketools.kafka_producer import KafkaProducer
from extract_phonenumber import ExtractPhoneNumber
from extract_website import ExtractWebsite
from extract_email import ExtractEmail
import datawaketools.entity_data_connector_factory as factory

from datetime import datetime
import traceback
import sys
import time


LOOKAHEAD_PRODUCER = None
entityDataConnector = factory.getEntityDataConnector()


def checkDomain(domain,type,entities):
    if len(entities) == 0:
        return []
    start = datetime.now()
    hits = entityDataConnector.get_domain_entity_matches(domain,type,entities)
    end = datetime.now()
    duration = str(end-start)
    #print '\tdomain hits: ',len(hits),' ',duration

    return hits



def extract(type,extractor,userId,url,html,org,domain):
    global LOOKAHEAD_PRODUCER

    values = extractor.test(html)
    values = map(lambda x: x.replace(',', ' ').strip(),values)


    if len(values) == 0:
        return
    else:
        print '\t',type,': ',len(values)

    if type == 'website':
        values = filter(lambda x: len(x) > 0, values)
        values = filter(lambda x: "google.com" not in x, values)
        values = map(lambda x: 'http:'+x if len(x) > 2 and x[:2] == '//' else x, values)

        toKafka = []
        for lookahed_url in values:
            #lastTimeTuple = entityDataConnector.getLastLookaheadTimestamp(lookahed_url)
            #if lastTimeTuple is None or lastTimeTuple[1] > 3600:
            toKafka.append(lookahed_url)
        if len(toKafka) > 0:
            print "SENDING TO KAFKA datawake-lookahead ",len(toKafka)," urls"
            dt = datetime.utcnow().strftime("%s")
            toKafka = map(lambda x: dt+'\0'+org+'\0'+domain+'\0'+x.replace('\0',''),toKafka)
            LOOKAHEAD_PRODUCER.sendBulk(toKafka)
            print 'sent'


    if len(values) > 0:
        entityDataConnector.insertEntities(url, type, values)
        domainHits = checkDomain(domain,type,values)
        if len(domainHits) > 0:
            entityDataConnector.insertDomainEntities(domain,url, type, domainHits)


if __name__ == '__main__':


    print 'tailing kafka queue at ',datawakeconfig.KAFKA_CONN_POOL,' topic: ',datawakeconfig.KAFKA_VISITING_TOPIC
    consumer = None

    extractEmail = ExtractEmail()
    extractPhone = ExtractPhoneNumber()
    extractWebsite = ExtractWebsite()


    while True:
        sys.stdout.flush()
        try:
            if consumer is None:
                consumer = KafkaConsumer(datawakeconfig.KAFKA_CONN_POOL,datawakeconfig.KAFKA_VISITING_TOPIC,'python-visiting-consumer')
            if LOOKAHEAD_PRODUCER is None:
                LOOKAHEAD_PRODUCER = KafkaProducer(datawakeconfig.KAFKA_CONN_POOL,datawakeconfig.KAFKA_LOOKAHEAD_TOPIC)
            # message is timestamp\nuserid\nurl\nmessage
            print 'waiting for message..'
            message = consumer.next().split('\0')
            (timestamp,org,domain,userId,url,html) = message

            print 'GOT MESSAGE"'
            print '\ttimesatmp: ',timestamp
            print '\tuserId: ',userId
            print '\turl: ',url


            # WEBSITES
            extract('website',extractWebsite,userId,url,html,org,domain)


            # EMAILS
            extract('email',extractEmail,userId,url,html,org,domain)

            # PHONES
            extract('phone',extractPhone,userId,url,html,org,domain)


            entityDataConnector.close()

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
            LOOKAHEAD_PRODUCER = None
            print ' waiting 10 seconds before trying to reconnect'
            time.sleep(10)
            continue




