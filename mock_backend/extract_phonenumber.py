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
    DIGIT_CUTOFF = 4 # eliminate below this, +1 for rate check
    # the 2 below may not work that great internationally
    RATE_LENGTH = 8 # typical rate length for removal
    PRESERVE_LENGTH = 10 # dont eliminate substring matches if above >=
    originalString = None

    def __init__(self):
        #Extract.__init__(self, myConfig, myTable, myFields)
        foo = 0
        # no precompiling done here
        
    def processObfuscations(self, bodyString):

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
	  
        """
        eliminating the twenty vs twenty-one debate
        anything with a space after is assumed to be stand-alone
        ex: 'twenty three' can equal both 20 3 or 23, but this is confusing
        to everyone, so assume any non-concatenated word has the 0 with it
        """
        # length 5
        self.myCompiledRE = re.compile('(?<=forty|fifty|sixty)\ ')
        bodyString = self.myCompiledRE.sub('0', bodyString)
        # length 6
        self.myCompiledRE = re.compile('(?<=twenty|thirty|eighty|ninety)\ ')
        bodyString = self.myCompiledRE.sub('0', bodyString)
        # length 7
        self.myCompiledRE = re.compile('(?<=seventy)\ ')
        bodyString = self.myCompiledRE.sub('0', bodyString)

        bodyString = bodyString.replace('phone','phonne')
        
        # make it so that it checks to make sure that these are before the phone numbers and not embedded in the number itself
        bodyString = bodyString.replace('*67','')
        bodyString = bodyString.replace('*82','')
        # replace any written references (forty, thirty) with the respective
        # number. No support > 99
        bodyString = bodyString.replace('ten', '10')
        bodyString = bodyString.replace('eleven', '11').replace('twelve', '12')
        bodyString = bodyString.replace('thirteen', '13').replace('fourteen', '14')
        bodyString = bodyString.replace('fifteen', '15').replace('sixteen', '16')
        bodyString = bodyString.replace('seventeen', '17').replace('eighteen', '18')
        bodyString = bodyString.replace('nineteen', '19')
        # we can do this thanks to the sub done prior
        bodyString = bodyString.replace('twenty', '2')
        bodyString = bodyString.replace('thirty', '3')
        bodyString = bodyString.replace('forty', '4')
        bodyString = bodyString.replace('fourty', '4')
        bodyString = bodyString.replace('fifty', '5')
        bodyString = bodyString.replace('sixty', '6')
        bodyString = bodyString.replace('seventy', '7')
        bodyString = bodyString.replace('eighty', '8')
        bodyString = bodyString.replace('ninety', '9')
        # replaced any written number with an actual number (ex: one --> 1)
        bodyString = bodyString.replace('zero','0').replace('one','1')
        bodyString = bodyString.replace('two','2').replace('three','3')
        bodyString = bodyString.replace('four','4').replace('five','5')
        bodyString = bodyString.replace('six','6').replace('seven','7')
        bodyString = bodyString.replace('eight','8').replace('nine','9')
        
        # remove all symbols from a standard US Keyboard
        # iterated left to right top to bottom
        bodyString = bodyString.replace('`','').replace('~','')
        bodyString = bodyString.replace('!','').replace('@','')
        bodyString = bodyString.replace('#','').replace('$','')
        bodyString = bodyString.replace('%','').replace('^','')
        bodyString = bodyString.replace('&','').replace('*','')
        bodyString = bodyString.replace('(','').replace(')','')
        bodyString = bodyString.replace('-','').replace('_','')
        bodyString = bodyString.replace('=','').replace('+','')
        bodyString = bodyString.replace('[','').replace('{','')
        bodyString = bodyString.replace(']','').replace('}','')
        bodyString = bodyString.replace('\\','').replace('|','')
        bodyString = bodyString.replace(';','').replace(':','')
        bodyString = bodyString.replace('\'','').replace('\"','')
        bodyString = bodyString.replace(',','').replace('<','')
        bodyString = bodyString.replace('.','').replace('>','')
        bodyString = bodyString.replace('/','').replace('?','')
        
        """
        Eliminating the lower case l's 
        or (prior upper case) I's that look like 1's.
        """
        self.myCompiledRE = re.compile('(?<=[0-9] )(l|i)(?= [0-9])')
        bodyString = self.myCompiledRE.sub('1', bodyString)
        
        self.myCompiledRE = re.compile('(?<=[0-9])(l|i)(?=[0-9])')
        bodyString = self.myCompiledRE.sub('1', bodyString)
        
        self.myCompiledRE = re.compile('(?<=[0-9])(l|i)(?= )')
        bodyString = self.myCompiledRE.sub('1', bodyString)
        
        self.myCompiledRE = re.compile('(?<= )(l|i)(?=[0-9])')
        bodyString = self.myCompiledRE.sub('1', bodyString)
        
        """
        Eliminating o's and oh's as a replcaement for 0
        """
        bodyString = bodyString.replace('oh','o')
        self.myCompiledRE = re.compile('(?<=[0-9] )(o)(?= [0-9])')
        bodyString = self.myCompiledRE.sub('0', bodyString)
        
        self.myCompiledRE = re.compile('(?<=[0-9])(o)(?=[0-9])')
        bodyString = self.myCompiledRE.sub('0', bodyString)
        
        self.myCompiledRE = re.compile('(?<=[0-9])(o)(?= )')
        bodyString = self.myCompiledRE.sub('0', bodyString)
        
        self.myCompiledRE = re.compile('(?<= )(o)(?=[0-9])')
        bodyString = self.myCompiledRE.sub('0', bodyString)
        
        # for 1-800-555-1212 numbers
        self.myCompiledRE = re.compile('(?<=[0-9])(oo)(?=[0-9])')
        bodyString = self.myCompiledRE.sub('00', bodyString)
        
        return bodyString
    
    def test(self, bodyString):
        if not bodyString:
            return []
        
        bodyString = bodyString.lower()
        
        self.originalString = bodyString
        
        bodyString = self.processObfuscations(bodyString)
        
        # Finally get the phone numbers
        self.myCompiledRE = re.compile('[0-9]{7,14}')
        
        # this is for finding numbers that are side by side
        # ex '5417764328 9078897654'
        phones1 = self.myCompiledRE.findall(bodyString)
        
        # remove whitespace
        bodyString = bodyString.replace('\t','').replace(' ','')
        phones2 = self.myCompiledRE.findall(bodyString)
        
        pn = self.removeSubnumbers(phones1, phones2, True)
                
        # remove numbers that have less than X different digits or look like a rate
        for number in pn:
            hashDigits = {}
            for digit in number:
                hashDigits[digit] = 1
            if len(hashDigits) < self.DIGIT_CUTOFF:
                pn.remove(number)
            elif len(hashDigits) < self.DIGIT_CUTOFF + 1 and \
                (len(number) == self.RATE_LENGTH or len(number) == self.RATE_LENGTH + 1):
                pn.remove(number)
                
        #orgs = self.getOriginals(pn, bodyString)
                
        #for i in range(len(pn)):
        #    pn[i] = {"text":orgs[i], "result":pn[i]}

        return pn
    
    def removeSubnumbers(self, list1, list2, simple = False):
        """
        Combines two number lists and removes any subnumbers associated within the two
        @param simple: Set to true if each lists are like ['2342', '2342'] not dicts
        @return: The single list with all unique values
        """
        mergeList = []
        
        # merge lists and get uniques
        if not simple:
            #print "not simple"
            mergeList = list1
            seenNumbers = []
            #print list1, list2
            for i in range(len(list1)):
                seenNumbers.append(list1[i]['result'])
            for i in range(len(list2)):
                if list2[i]['result'] not in seenNumbers:
                    seenNumbers.append(list2[i]['result'])
                    mergeList.append(list2[i])
                    
            #print mergeList
            hasChanged = True
            while hasChanged:
                hasChanged = False
                combos = itertools.combinations(mergeList, 2)

                for item in combos:
                    if self.testEnding(item[0]['result'], item[1]['result']):
                        mergeList.remove(item[0])
                        hasChanged = True;
                        break;
                    if self.testEnding(item[1]['result'], item[0]['result']):
                        mergeList.remove(item[1])
                        hasChanged = True;
                        break;        
        else:
            mergeList = list(set(list1 + list2))
            
            # remove the substring ended duplicates
            # ie: 9874422 and 5409874422 (will remove the 1st one)
            hasChanged = True
            while hasChanged:
                hasChanged = False
                combos = itertools.combinations(mergeList, 2)

                for item in combos:
                    if self.testEnding(item[0], item[1]):
                        mergeList.remove(item[0])
                        hasChanged = True;
                        break;
                    if self.testEnding(item[1], item[0]):
                        mergeList.remove(item[1])
                        hasChanged = True;
                        break;
                    
        #print "FINAL:", mergeList
        return mergeList
    
    def testEnding(self, string1, string2):
        """
        Returns true if string1 is at the tail end of string2
        """
        len1 = len(string1)
        len2 = len(string2)
        if len1 < self.PRESERVE_LENGTH and len1 < len2:
            if string2.rfind(string1) == (len2 - len1):
                return True
        return False
    
    def getOriginals(self, numbers, finalString):
        """
        Tries to find the resulting phone numbers contained within the
        original string
        @param numbers: a list of phone numbers
        @param finalString: the final string the results were found in
        @return The original strings (if found)
        """
        TOO_LARGE = 5
        orgs = []
        #print "START", numbers, finalString
        
        # compile the simple RE
        theRE = re.compile('[0-9]{7,14}')
        
        # loop through all numbers
        for i in range(len(numbers)):
            numb = numbers[i]
            foundNumb = False
            foundNumbString = ''
            foundNumbStringLen = 999
            bunches = [(s.start(), s.end()) for s in re.finditer(numb, finalString)]

            if len(bunches) > TOO_LARGE:
                bunches = self.cutDownList(bunches, TOO_LARGE)
            # loop through all substring (start, end)'s
            for j in range(len(bunches)):
                tup = bunches[j]
                amount = 3 # the number of chars to try to match on each side - arbitrary
                begin = bunches[j][0] - amount 
                if begin < 0:
                    begin = 0
                end = bunches[j][1] + amount
                if end > len(finalString):
                    end = len(finalString)
                    
                foundInBunch = False
                    
                shortStart = finalString[begin:bunches[j][0]]
                
                startCase = False
                # the detected phone number was the the beginning
                if bunches[j][0] == begin:
                    startCase = True
                
                # iterate though start sequence string
                while (len(shortStart) > 0 or startCase) and not foundInBunch:
                    #print "SS:", shortStart
                    beginFind = [s.end() for s in re.finditer(shortStart, self.originalString)]
                    # if this case the above returns []
                    # make a list containing a 0 index value
                    if startCase:
                        beginFind = [0]
                    
                    # high to low for left side
                    beginFind.reverse()
                    
                    if len(beginFind) > TOO_LARGE:
                        beginFind = self.cutDownList(beginFind, TOO_LARGE)
                    
                    #print "bf:", beginFind
                    # iterate through all found start instances
                    for k in range(len(beginFind)):
                        #print ("FOR")
                        if foundInBunch:
                            break
                        
                        beginIndex = beginFind[k]
                        #print "C2:", bunches[j][1], end
                        shortEnd = finalString[bunches[j][1]:end]
                        endCase = False
                        # the detected phone number was at the end
                        if bunches[j][1] == end:
                            endCase = True
                        
                        while (len(shortEnd) > 0 or endCase) and not foundInBunch:
                            #print "WHILE"
                            #print len(shortEnd)
                            endFind = [s.start() for s in re.finditer(shortEnd, self.originalString[beginIndex:])]
                            # if this case the above will return an empty result
                            # need to make a list containing the ending index
                            if endCase:
                                endFind = [len(self.originalString)]
                                
                            if len(endFind) > TOO_LARGE:
                                endFind = self.cutDownList(endFind, TOO_LARGE)
                            
                            #print "ef:", endFind
                            # iterate through all found end instances
                            for l in range(len(endFind)):
                                endIndex = endFind[l]
                                #print "LOOP"
                                originalCut = self.originalString[beginIndex:beginIndex + endIndex]
                                #print "indicies:", beginIndex, beginIndex + endIndex
                                #print "originalCut:", originalCut
                                #print startCase, endCase
                                #print l
                                finalCutString = self.processObfuscations(originalCut)
                                #print finalCutString
                                attempt = theRE.findall(finalCutString)
                                #print attempt
                                #number found!
                                if numb in attempt:
                                    #print "FOUND", numb, "in", originalCut
                                    foundNumb = True
                                    if len(originalCut) < foundNumbStringLen:
                                        foundNumbStringLen = len(foundNumbString)
                                        foundNumbString = originalCut
                                        foundInBunch = True
                                        break
                                else:
                                    # remove whitespace
                                    finalCutString = finalCutString.replace('\t','').replace(' ','')
                                    #print "inside FCS:", finalCutString
                                    attempt = theRE.findall(finalCutString)
                                    #print "inside attempt2:", attempt
                                    # number found!
                                    if numb in attempt:
                                        #print "FOUND", numb, "in", originalCut  
                                        foundNumb = True 
                                        if len(originalCut) < foundNumbStringLen:
                                            foundNumbStringLen = len(foundNumbString)
                                            foundNumbString = originalCut   
                                            foundInBunch = True
                                            break                                 
                            
                            # chop on the end
                            shortEnd = shortEnd[:-1]
                            if endCase:
                                endCase = False
                                
                    #chop on the beginning
                    shortStart = shortStart[1:]
                    if startCase:
                        startCase = False
            # done with all bunches
            if foundNumb:
                #print "RESULT:", foundNumbString
                orgs.append(foundNumbString)
            else:
                #print "RESULT: unknown"
                orgs.append("unknown")
        return orgs
        
    def cutDownList(self, list, size):
        """
        Tries to evenly reduce the size of the list to the specified length
        guarantees start and end items
        @param list: the list with too many values
        @parm length: the desired length
        """
        #print "originalList:", list
        if len(list) <= size:
            return list
        
        returnList = []
        # preserve first item
        returnList.append(list[0]) 
        
        if size <= 2:
            returnList.append(list[len(list) - 1])
            return returnList
        
        numb = int(math.floor((len(list) - 2) / (size - 2)))
        index = 0
        while len(returnList) < size - 1:
            index += numb
            returnList.append(list[index])
        returnList.append(list[len(list) - 1])            
        #print "resultList:", returnList
        return returnList

