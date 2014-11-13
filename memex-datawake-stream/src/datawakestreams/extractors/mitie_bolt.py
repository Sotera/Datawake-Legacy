from extractors.extract_info import ExtractInfo
from datawakestreams.extractors.extractor_bolt import ExtractorBolt

class MitieBolt(ExtractorBolt):

    name ='mitie_extractor'

    def __init__(self):
        ExtractorBolt.__init__(self)
        self.extractor = ExtractInfo()

