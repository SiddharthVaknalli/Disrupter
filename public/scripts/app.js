$("#message").fadeOut(3000);

$('#commentBtn').prop('disabled', true);
     $('#commentText').keyup(function() {
        if($(this).val() != '') {
           $('#commentBtn').prop('disabled', false);
        }
        else {
            $('#commentBtn').prop('disabled', true);
        }
    });