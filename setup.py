#!/usr/bin/env python3

# Setup Project Skeleton
# * use express.js as web framework
# * use React.js as reactive view layer
# * use Typescript with Babel in both FE and BE scripting language
# * use Sass as stylesheet composing language
# * use Pug as static and dynamic HTML templating/composition language
# * use gulp as project management tool
# * use webpack as frontend and partial backend packing tool



import os, sys, subprocess as sp

SETUP_CMDS = {}

def setup_cmd(cmd):
    SETUP_CMDS[cmd.__name__] = cmd


@setup_cmd
def default():
    create_express_proj()
    restructure_express_proj()

def create_express_proj():
    create_express_cmd = ['express', '-f', '-v', 'pug', '-c', '--git', '.']
    if sp.call(create_express_cmd, timeout=4):
        print("Creating Express project failed, go and install express.js")
        error_code = sp.call(['npm', 'install', '-g', 'express'], timeout=60*20)
        if error_code:
            print ("Installling express.js failed with code {0}. You should install npm first!".format(error_code))
            os.abort()

        if sp.call(create_express_cmd, timeout=4):
            print("Express creating failed again. Abort");
            os.abort()

def restructure_express_proj():
    print ("Restructure Project Directories according to this config");
    for cn, c in config_seq:
        print('{!s:<20}{!s}'.format(cn, c), sep='\t')

    for cn, c in config_seq:
        os.makedirs(c, exist_ok = True)

    if not (0 == sp.call('mv routes/*.js ' +  config['srv_js_build_in'], shell=True) and 0 == sp.call('mv views/*.pug ' + config['pug_build_in'], shell=True)):
        print("Restructure Project Directory fail!")
        os.abort()

    sp.call(['rm', '-rf', 'routes', 'views'])


@setup_cmd
def distclean():
    del_dirs = ['rm', '-rf', 'app.js', 'bin', 'dist', 'public', 'res', 'routes', 'src', 'views']
    sp.call(del_dirs)


@setup_cmd
def clean():
    del_express_cmd = ['rm', '-rf', 'dist']



if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Setup Express Web Skeleton')
    parser.add_argument('target', nargs='?', action='store', default="default", help='Target name. setup.py help for available commands')
    #parser.add_argument('-h', '--help', action='help', help='Print this help')

    setup_args = parser.parse_args(sys.argv[1:])


    config_str = sp.check_output(['node', 'config.js', 'print_dirs'])
    #from io import StringIO
    #config_stream = StringIO(config_str.decode('utf-8'))
    config_seq = [l.split() for l in config_str.strip().decode('utf-8').split('\n')]
    config = dict(config_seq)

    SETUP_CMDS[setup_args.target]()

