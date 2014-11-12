from extractors.extract_phonenumber import ExtractPhoneNumber
from datawakestreams.extractors.extractor_bolt import ExtractorBolt

class PhoneBolt(ExtractorBolt):

    name ='phone_extractor'

    def __init__(self):
        ExtractorBolt.__init__(self)
        self.extractor = ExtractPhoneNumber()

