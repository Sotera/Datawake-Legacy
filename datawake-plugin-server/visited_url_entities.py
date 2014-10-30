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

import json

import tangelo
import cherrypy
import datawaketools.entity_data_connector_factory as factory

from validate_parameters import required_parameters
from users import is_in_session


"""
  Return the list of entities extracted from a url

"""


@is_in_session
@required_parameters(['url', 'domain'])
def get_all_entities(url, domain):
    entity_data_connector = None
    try:
        entity_data_connector = factory.getEntityDataConnector()
        all_entities = entity_data_connector.getExtractedEntitiesFromUrls([url])
        domain_extracted = entity_data_connector.getExtractedDomainEntitiesFromUrls(domain, [url])
        entities = dict(domainExtracted=domain_extracted.get(url, {}), allEntities=all_entities.get(url, {}))
        return json.dumps(entities)

    finally:
        entity_data_connector.close()


@is_in_session
@required_parameters(['url', 'domain'])
def get_domain_extracted_entities(url, domain):
    entity_data_connector = None
    try:
        entity_data_connector = factory.getEntityDataConnector()
        domain_entities = entity_data_connector.getExtractedDomainEntitiesFromUrls(domain, [url])
        return json.dumps(dict(domainExtracted=domain_entities.get(url)))
    finally:
        if entity_data_connector is not None:
            entity_data_connector.close()


post_actions = {
    'entities': get_all_entities,
    'extracted': get_domain_extracted_entities
}


@tangelo.restful
def post(action, *args, **kwargs):
    post_data = json.loads(cherrypy.request.body.read(), strict=False)

    def unknown(**kwargs):
        return tangelo.HTTPStatusCode(404, "unknown service call")

    return post_actions.get(action, unknown)(**post_data)


