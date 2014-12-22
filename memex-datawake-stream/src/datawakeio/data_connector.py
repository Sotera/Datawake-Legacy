class ExtractedDataConnector:

    def __init__(self):
        pass


    def open(self):
        raise NotImplementedError("Implement open()")


    def close(self):
        raise NotImplementedError("Implement close()")


    def _check_conn(self):
        raise NotImplementedError("Implement _checkConn()")



    def insert_entities(self, url, entity_type, entity_values):
        raise NotImplementedError("Implement insertEntities()")


    def insert_domain_entities(self, domain,url, entity_type, entity_values):
        raise NotImplementedError("Implement insertDomainEntities()")


    def get_domain_entity_matches(self, domain, type, values):
        raise NotImplementedError("Implement getEntityMatches()")





