#!/usr/bin/perl

print `clear`;

print "\nHello! This PERL script will install a cron job to restart the Datawake Docker";
print "\ninstances every morning @ 0600. Whosoever runs it needs to have 'root' priveleges.";
print "\n\n";

prompt_yn('Continue?') || die;

die "Must run as root! Use 'sudo'!\n\n" unless ($< == 0);

print "\nLooking for fig.yml in all the wrong places! Til the right one comes along ...";
print "\n\n";

$figPath = `find / -name fig.yml`;

#Remove linefeed from $figPath
$figPath =~ s/\R//g;

if(!$figPath){
  print "Man, sorry! Looked in the whole file system and couldn't find a 'fig.yml' file.\n";
  die "I needs me my 'fig.yml' file!\n\n";
}

print "OK! Using 'fig.yml' at: $figPath\n\n";

$res = `crontab -l`;
if($res eq 'no crontab for root'){
  print `{ cat; echo "0 6 * * * /usr/local/bin/_restart_datawake.pl"; } | crontab -`;
}else{
  print `crontab -l | { cat; echo "0 6 * * * /usr/local/bin/_restart_datawake.pl"; } | crontab -`;
}

$restartDatawakeScriptPath = '/usr/local/bin/_restart_datawake.pl';
print "Writing $restartDatawakeScriptPath\n";
@lines = <DATA>;
open(FILE, "> $restartDatawakeScriptPath");
foreach(@lines){
  $_ =~ s/__FIG_PATH__/$figPath/;
  print FILE "$_";
}
close(FILE);

print `sudo chmod 700 $restartDatawakeScriptPath`;

die "\n\nFinished!";

print "Starting Docker ...\n";
print `sudo service docker start`;

print "Getting and turning up 'mysql' docker container ...\n";
print `cd src/Datawake/dev-env; sudo fig up -d mysql;`;

print "Setting up MySQL database and creating test user ...\n";
print `cd src/Datawake/dev-env; ./init_db.sh;`;

print "Turning up remaining docker containers ...\n";
print `cd src/Datawake/dev-env; sudo fig up -d;`;

sub prompt {
    my ($query) = @_; # take a prompt string as argument
    local $| = 1; # activate autoflush to immediately show the prompt
    print $query;
    chomp(my $answer = <STDIN>);
    return $answer;
}
sub prompt_yn {
    my ($query) = @_;
    my $answer = prompt("$query (Y/N): ");
    return lc($answer) eq 'y';
}
__END__
#!/usr/bin/perl
`sudo fig -f __FIG_PATH__ up -d`;
