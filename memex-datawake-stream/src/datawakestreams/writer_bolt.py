from __future__ import absolute_import, print_function, unicode_literals
from streamparse.bolt import Bolt


FILENAME = '/vagrant/memex-datawake-stream/testout.csv'

class FileWriterBolt(Bolt):
    """
    WriterBolt

    For local testing only, write output to a local file

    """

    def __init__(self):
        Bolt.__init__(self)
        self.fobj = open(FILENAME,'w')


    def process(self, tup):
        """
        Writes the input out to a local file
        :param tup:   (attribute,value,extracted_raw,extracted_metadata,context)
        :return:    None

        context = {
            'source':'datawake-visited',
            'userId':user_id,
            'org':org,
            'domain':domain,
            'url':url
        }

        """
        (attribute,value,extracted_raw,extracted_metadata,context) = tup.values
        buffer = []
        buffer.append(context['source'])
        buffer.append(context['org'])
        buffer.append(context['domain'])
        buffer.append(context['url'])
        buffer.append(attribute)
        buffer.append(context['userId'])
        buffer.append(value)
        buffer.append(extracted_raw)
        self.fobj.write(','.join(buffer)+'\n')

