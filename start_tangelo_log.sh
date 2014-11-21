vagrant ssh-config | grep IdentityFile  | awk '{print $2}'
ssh 127.0.0.1 -p 2222  -i ~/.vagrant.d/insecure_private_key -l vagrant "tail -f ~/.config/tangelo/tangelo.log" >> remote-tangelo.log &
tail -f remote-tangelo.log
