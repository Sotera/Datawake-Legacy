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

    def get_matching_entities_from_url(self, urls):
        raise NotImplementedError("Implement get_matching_entities_from_url() ")

    def get_extracted_domain_entities_for_urls(self, domain, urls):
        raise NotImplementedError("Implement get_extracted_domain_entities_for_urls")

    def getExtractedEntitiesFromUrls(self,urls,type=None):
        raise NotImplementedError("Implement getExtractedEntitiesFromUrls()")


    def getExtractedDomainEntitiesFromUrls(self,domain,urls,type=None):
        raise NotImplementedError("Implement getExtractedDomainEntitiesFromUrls()")


    def getExtractedEntitiesWithDomainCheck(self, urls, types=[], domain='default'):
        raise NotImplementedError("Implement getExtractedEntitiesWithDomainCheck()")


    def insertEntities(self, url, entity_type, entity_values):
        raise NotImplementedError("Implement insertEntities()")


    def insertDomainEntities(self, domain,url, entity_type, entity_values):
        raise NotImplementedError("Implement insertDomainEntities()")


    def get_domain_entity_matches(self, domain, type, values):
        raise NotImplementedError("Implement getEntityMatches()")


    def get_domain_items(self, name, limit):
        raise NotImplementedError("Implement get_domain_items()")


    def delete_domain_items(self, domain_name):
        raise NotImplementedError("Implement delete_domain_items()")


    def add_new_domain_items(self, domain_items):
        raise NotImplementedError("Implement add_new_domain_items()")