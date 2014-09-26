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

class DataConnector:

    def __init__(self):
        pass

    def open(self):
        raise NotImplementedError("Implement open()")

    def close(self):
        raise NotImplementedError("Implement close()")

    def _checkConn(self):
        raise NotImplementedError("Implement _checkConn()")

    def getLookaheadEntities(self, url, org, domain='default'):
        raise NotImplementedError("Implement getLookaheadEntities()")

    def insertLookaheadEntities(self, url, entity_type, entity_values, indomain, org, domain='default'):
        raise NotImplementedError("Implement insertLookaheadEntities()")

    def getLookaheadEntityMatches(self, urls, entity_set, org, domain='default'):
        raise NotImplementedError("Implement getLookaheadEntityMatches()")

    def insertVisitedEntities(self, userId, url, entity_type, entity_values, indomain, domain='default', org='default'):
        raise NotImplementedError("Implement insertVisitedEntities()")

    def getVisitedEntities(self, userId, url, org, domain='default'):
        raise NotImplementedError("Implement getVisitedEntities()")

    def getVisitedEntitiesByUsersAndTypes(self, userIds, urls, types, org, domain='default'):
        raise NotImplementedError("Implement getVisitedEntitiesByUsersAndTypes()")

    def getEntityMatches(self, domain, type, values):
        raise NotImplementedError("Implement getEntityMatches()")

    def get_domain_items(self, name, limit):
        raise NotImplementedError("Implement get_domain_items()")

    def delete_domain_items(self, domain_name):
        raise NotImplementedError("Implement delete_domain_items()")

    def add_new_domain_items(self, domain_items):
        raise NotImplementedError("Implement add_new_domain_items()")