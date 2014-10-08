#!/usr/bin/python
# -*- coding: utf-8 -*-
"""
extraction of information using MIT-LL MITIE
"""
#from extract import Extract
import re
import sys, os
sys.path.append('/home/vagrant/MITIE/mitielib')
from mitie import *
from collections import defaultdict
from bs4 import BeautifulSoup

class ExtractInfo():
    myName = "info"

    def __init__(self):
        self.ner = named_entity_extractor('/home/vagrant/MITIE/MITIE-models/english/ner_model.dat')
        # self.myCompiledRE = re.compile('([a-z,A-Z,0-9,\.,_,\-]+@[a-z,A-Z,0-9,_,\-]+\.[a-z,A-Z,0-9,_,\-,\.]+)')
        # This lets us keep B@nGiN
        #self.myCompiledRE = re.compile('([a-z,A-Z,0-9,\.,_,\-]+@[a-z,A-Z,0-9,_,\-]+[a-z,A-Z,0-9,_,\-,\.]+)')
        # legacy
        #^([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$
    
    def test(self, bodyString):
        soup = BeautifulSoup(bodyString)
        tokens = tokenize(soup.get_text().encode('ascii', 'ignore'))
        entities = self.ner.extract_entities(tokens)
        #print entities
        ents = {}
        for e in entities:
            range = e[0]
            tag = e[1]
            entity_text = " ".join(tokens[i] for i in range)
            txt = tag + ' -> ' + entity_text
            if ents.get(txt) == None:
                ents[txt] = 0
            ents[txt] += 1
        ent_array = []
        for key in ents.keys():
            ent_array.append(key + ' -> ' + str(ents[key]))
        ent_set = list(set(ent_array))
        return ent_set

