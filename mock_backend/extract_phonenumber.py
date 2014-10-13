#!/usr/bin/python
# -*- coding: utf-8 -*-
"""
extraction of phonenumbers
"""
#from extract import Extract
import re
import itertools
import math
import pdb
class ExtractPhoneNumber():
    myName = "phone"


        
    def clean(self, bodyString):

        """
        Remove <script> tags and <style> tags
        """
        bodyString = re.sub('<script.*?>.*?</script>','',bodyString,flags=re.DOTALL)
        bodyString = re.sub(r'<style>.*?</style>','',bodyString,flags=re.DOTALL)

        """
        Remove text in between option tags
        """
        bodyString = re.sub('<option.*?</option>', '', bodyString)


        """
        Eliminate HTML tags for now
        """
        bodyString = re.sub(r'<.*?>', '', bodyString,flags=re.DOTALL)


        # Reove dates of the from xx/xx/xxxx
        bodyString = re.sub(r'\d{0,2}/\d{0,2}\d{0,4}','',bodyString,flags=re.DOTALL)
        # remove dates like 02, 2013
        bodyString = re.sub(r'\d{1,2}, \d{4}','',bodyString,flags=re.DOTALL)
        # remove times
        bodyString = re.sub(r'\d{1,2}:\d{2}','',bodyString,flags=re.DOTALL)


        """
        Eliminate UA tags in javascript for now too
        """

        bodyString = re.sub('(\'ua-[0-9]*-[0-9]*\')', '', bodyString)
        bodyString = re.sub('(href="[^"]*")', '', bodyString)
        bodyString = re.sub('(\d\'\d/\d\d\d?/\d\d)', '', bodyString)
        bodyString = re.sub('(\d\d?:\d\d-\d\d?:\d\d)', '', bodyString)
        bodyString = re.sub('(\d{2,3}(?:/)\d{2,3}(?:/)\d{2,3})(?=\D|$)', '', bodyString)
        bodyString = re.sub('(&#[0-9]{1,6}(?:\;)?)', '', bodyString)
        bodyString = re.sub('(value="^"*")', '', bodyString)



        bodyString = bodyString.replace('-','')


        return bodyString



    def test(self, bodyString):
        if not bodyString:
            return []
        bodyString = bodyString.lower()
        bodyString = self.clean(bodyString)
        
        # Finally get the phone numbers
        self.myCompiledRE = re.compile('[0-9]{7,14}')
        # remove whitespace
        bodyString = bodyString.replace('\t','').replace(' ','')
        return  self.myCompiledRE.findall(bodyString)

    

    

    
