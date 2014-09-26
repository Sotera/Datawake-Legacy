#!/usr/bin/python
# -*- coding: utf-8 -*-
"""
extraction of emails
"""
#from extract import Extract
import re

class ExtractEmail():
    myName = "email"

    def __init__(self):
        self.myCompiledRE = re.compile('([a-z,A-Z,0-9,\.,_,\-]+@[a-z,A-Z,0-9,_,\-]+\.[a-z,A-Z,0-9,_,\-,\.]+)')
        # This lets us keep B@nGiN
        #self.myCompiledRE = re.compile('([a-z,A-Z,0-9,\.,_,\-]+@[a-z,A-Z,0-9,_,\-]+[a-z,A-Z,0-9,_,\-,\.]+)')
        # legacy
        #^([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$
    
    def test(self, bodyString):
        email = self.myCompiledRE.findall(bodyString)
        email = list(set(email))
        return email
