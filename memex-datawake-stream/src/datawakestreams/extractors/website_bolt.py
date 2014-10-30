from extractors.extract_website import ExtractWebsite
from datawakestreams.extractors.extractor_bolt import ExtractorBolt

class WebsiteBolt(ExtractorBolt):

    name ='website_extractor'

    def __init__(self):
        ExtractorBolt.__init__(self)
        self.extractor = ExtractWebsite()

