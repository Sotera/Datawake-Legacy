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

import re
import json

import tangelo

import datawake.util.kafka.kafka_producer as kafka_producer
import datawake.util.db.datawake_mysql as db
from datawake.util.session.helper import is_in_session
from datawake.util.session import helper
from datawake.util.validate.parameters import required_parameters


"""
 List / Create Trails

    primarily used on the plugin newTab.

"""

#
# Perform a starts-with search for trails
#
@is_in_session
@required_parameters(['domain'])
def get_trails(domain):
    org = helper.get_org()
    return get_trails_for_domain_and_org(org, domain)


def get_trails_for_domain_and_org(org, domain):
    trails = db.listTrails(org, domain)
    response = dict(trails=trails)
    return json.dumps(response)


@is_in_session
@required_parameters(['domain', 'trail', 'entity'])
def add_trail_based_entity(domain, trail, entity):
    org = helper.get_org()
    if not db.does_trail_entity_exist(org, domain, trail, entity):
        success = db.add_trail_based_entity(org, domain, trail, entity.encode("utf-8")) == 0
        if success:
            kafka_producer.send_trail_term_message(org, domain, trail, entity)

        return json.dumps(dict(success=success))
    return json.dumps(dict(success=True))



@is_in_session
@required_parameters(['domain', 'trail'])
def get_trail_based_entities(domain, trail):
    entities = db.get_trail_based_entities(helper.get_org(), domain, trail)
    irrelevantEntities = db.get_irrelevant_trail_based_entities(helper.get_org(), domain, trail)
    return json.dumps(dict(entities=entities, irrelevantEntities=irrelevantEntities))


@is_in_session
@required_parameters(['domain', 'trailname'])
def add_trail(trailname, domain, traildescription=u''):
    tangelo.log('datawake_trails POST trailname=%s traildescription=%s domain=%s' % (trailname, traildescription, domain))
    user = helper.get_user()
    org = user.get_org()
    invalid = re.match('^[\w]*(?!:)+$', trailname) is None
    if invalid:
        raise ValueError("Trail names must be alphanumeric and not contain a ':'")
    last_row = db.addTrail(org, trailname, traildescription, user.get_email(), domain=domain)
    return json.dumps(dict(success=last_row >= 0))


@is_in_session
@required_parameters(['domain', 'trail'])
def get_trail_entity_links(domain, trail):
    org = helper.get_org()
    links = json.dumps(dict(visited=db.get_visited_trail_entity_links(org, domain, trail), notVisited=db.get_not_visited_trail_entity_links(org, domain, trail)))
    tangelo.log("Links %s" % links)
    return links


@is_in_session
@required_parameters(['domain', 'trail', 'url'])
def delete_link_from_trail(domain, trail, url):
    org = helper.get_org()
    success = db.delete_link_from_trail(org, domain, trail, url) == 0
    return json.dumps(dict(success=success))


@is_in_session
@required_parameters(['domain', 'trail', 'entity'])
def add_irrelevant_trail_entity(domain, trail, entity):
    org = helper.get_org()
    if not db.does_irrelevant_entity_exist(org, domain, trail, entity):
        success = db.add_irrelevant_trail_entity(org, domain, trail, entity.encode("utf-8")) == 0
        if success:
            kafka_producer.send_trail_term_message(org, domain, trail, entity, False)
        return json.dumps(dict(success=success))
    return json.dumps(dict(success=True))


@is_in_session
@required_parameters(['domain', 'trail', 'url'])
def get_url_entities(domain, trail, url):
    return json.dumps(dict(entities=db.get_entities_on_url(helper.get_org(), domain, trail, url)))


post_actions = {
    'get': get_trails,
    'create': add_trail,
    'entity': add_trail_based_entity,
    'entities': get_trail_based_entities,
    'links': get_trail_entity_links,
    'irrelevant': add_irrelevant_trail_entity,
    'deleteLink': delete_link_from_trail,
    'urlEntities': get_url_entities
}


@tangelo.restful
def post(action, *args, **kwargs):
    body = tangelo.request_body().read()
    post_data = json.loads(body, strict=False)

    def unknown(**kwargs):
        return tangelo.HTTPStatusCode(404, "unknown service call")

    return post_actions.get(action, unknown)(**post_data)
