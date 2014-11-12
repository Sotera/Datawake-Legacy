import sys
import csv
import argparse
import os.path

from datawake.util.db import datawake_mysql


"""
Command line utility for adding and removing email org links

usage python orgLoader.py [--delete] orgfile.csv

orgfile.csv should be one link per line seperated by a comma:  emailAddress,orgName

"""


def loadOrgs(add, file):
    if not os.path.isfile(file):
        print 'file not found ', file
        sys.exit(1)
    fobj = open(file, 'r')
    reader = csv.reader(fobj)
    for row in reader:
        if add:
            print 'add ', row
            datawake_mysql.addOrgLink(row[0], row[1])
        else:
            print 'delete ', row
            datawake_mysql.deleteOrgLink(row[0], row[1])
    fobj.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Add or remove email org links')
    parser.add_argument('orgFile', help='csv file of email address, org name')
    parser.add_argument('--delete', action='store_false', help='delete relationships. default=add')
    parser.add_argument('--demo', action='store_true', help="Set up demo org")
    args = parser.parse_args()
    if args.demo:
        datawake_mysql.addOrgLink("john.doe@nomail.none", "MEMEXDEMO")
    else:
        loadOrgs(args.delete, args.orgFile)

