from bolts.extractors.extract_phonenumber import ExtractPhoneNumber
from bolts.extractors.extractor_bolt import ExtractorBolt

class PhoneBolt(ExtractorBolt):

    name ='phone_extractor'

    def __init__(self):
        ExtractorBolt.__init__(self)
        self.extractor = ExtractPhoneNumber()

