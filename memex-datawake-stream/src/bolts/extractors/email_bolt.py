from bolts.extractors.extract_email import ExtractEmail
from bolts.extractors.extractor_bolt import ExtractorBolt

class EmailBolt(ExtractorBolt):

    name ='email_extractor'

    def __init__(self):
        ExtractorBolt.__init__(self)
        self.extractor = ExtractEmail()

