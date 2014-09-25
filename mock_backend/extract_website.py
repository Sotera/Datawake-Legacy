#!/usr/bin/python
# -*- coding: utf-8 -*-
"""
extraction of any link URLs from ads
"""
#from extract import Extract
import re

class ExtractWebsite():
    myName = "website"
    
    valid = ['.info', '.com', '.in', '.net', \
             '.hk', '.ru', '.biz', '.org', '.sq', \
             '.us', '.uk', '.ca', '.mx', '.de', \
             '.fr', '.es', '.co', '.cz', '.nz', \
             '.gr', '.nl', '.phtml', '.htm']

    def __init__(self):
        #self.myCompiledRE = re.compile('(?:http[s]?\:\/\/)?(?:www\.)?((?:[a-z,0-9]+(?:_|\-)?)+\.[a-z]{2,6}[a-z,0-9,\-,\.,\/,_]*)')
        self.myCompiledRE = re.compile('(?:href=")(\S{3,100})(?=")')
        
    def test(self, bodyString):
        bodyString = bodyString.lower()
        
        website = self.myCompiledRE.findall(bodyString)
        website = list(set(website))
        
        count = 0
        while count < len(website):
            site = website[count]
            end= site.rfind('.')
            
            ending = site[end:]
            slash = ending.find('/')
            if slash != -1:
                ending = ending[:slash]
            
            #print end, slash, ending, site
            
            # emails
            if('mailto' in site) or (site.isdigit()):
                del website[count]
            # tld's
            elif len(ending) > 0:
                if ending not in self.valid:
                    del website[count]
                else:
                    count = count + 1

            # TODO, i think this is removing relative links
            # no ending
            elif len(ending) == 0:
                del website[count]
            else:
                count = count + 1
                
        return website
