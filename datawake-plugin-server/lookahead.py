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

import users


"""

  Get lookahead data for a give URL

"""


def get_lookahead(url=u'', srcurl=u'', domain=u''):
    if url == u'' or srcurl == u'' or domain == u'':
        raise ValueError("lookahead - url,srcurl and domain must be specified. url:" + url + " srcurl:" + srcurl + " domain:" + domain)
    if users.is_in_session():
        entity_data_connector = None
        try:
            entity_data_connector = factory.getEntityDataConnector()

            # get the features from the lookahead url that are also on the src url
            entities = entity_data_connector.getExtractedEntitiesFromUrls([url, srcurl])
            matches = []
            lookahead_entities = entities.get(url, {})
            visited_features = entities.get(srcurl, {})
            all_types = set([])
            all_types.update(lookahead_entities.keys())
            all_types.update(visited_features.keys())
            for entity_type in all_types:
                l = set([]) if entity_type not in lookahead_entities else set(lookahead_entities[entity_type])
                v = set([]) if entity_type not in visited_features else set(visited_features[entity_type])
                matches.extend(list(v & l))
            del visited_features
            del lookahead_entities
            del all_types
            # get the domain matches from the lookahead url
            domain_lookahead_features = entity_data_connector.getExtractedDomainEntitiesFromUrls(domain, [url])
            domain_lookahead_features = domain_lookahead_features.get(url, {})
            domain_matches = domain_lookahead_features.values()

            del domain_lookahead_features

            result = dict(url=url, matches=matches, domain_search_matches=domain_matches)
            return json.dumps(result)
        finally:
            if entity_data_connector is not None:
                entity_data_connector.close()
    return json.dumps(dict(matches=[], domain_search_matches=[]))


post_actions = {
    'matches': get_lookahead
}


@tangelo.restful
def post(action, *args, **kwargs):
    post_data = json.loads(cherrypy.request.body.read(), strict=False)

    def unknown(**kwargs):
        return tangelo.HTTPStatusCode(400, "unknown service call")

    return post_actions.get(action, unknown)(**post_data)
