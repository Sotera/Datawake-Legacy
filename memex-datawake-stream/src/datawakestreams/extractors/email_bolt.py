from extractors.extract_email import ExtractEmail
from datawakestreams.extractors.extractor_bolt import ExtractorBolt

class EmailBolt(ExtractorBolt):

    name ='email_extractor'

    def __init__(self):
        ExtractorBolt.__init__(self)
        self.extractor = ExtractEmail()

