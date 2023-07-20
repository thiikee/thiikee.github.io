/** 
 * Helper function to call MS Graph API endpoint
 * using the authorization bearer token scheme
*/
function callMSGraph(endpoint, token, callback) {
  const headers = new Headers();
  const bearer = `Bearer ${token}`;

  headers.append("Authorization", bearer);

  const options = {
      method: "GET",
      headers: headers
  };

  //console.log('request made to Graph API at: ' + new Date().toString());
  //console.log(endpoint);
  //console.log(callback);

  //fetch(endpoint, options)
  //    .then(response => response.json())
  //    .then(response => callback(response, endpoint))
  //    .catch(error => console.log(error));

  $.ajax({
    headers: {
      Authorization: bearer
    },
    type: 'GET',
    url: endpoint
  }).done(callback).fail((xhr, status, error) => {
    console.log(error);
    console.log(xhr);
    throw new Error(error);
  });
}

function batchMSGraph(endpoints, data, token, callback) {
  console.log(endpoints);
  const headers = new Headers();
  const bearer = `Bearer ${token}`;
  headers.append("Authorization", bearer);
  $.ajax({
    headers: {
      Authorization: bearer,
      'Content-Type': 'application/json'
    },
    type: 'POST',
    dataType: 'json',
    contentType: 'application/json',
    url: graphConfig.batchEndpoint,
    data: JSON.stringify({
      requests: endpoints.map((e) => {
        return {
          id: e.id,
          method: 'POST',
          url: e.url,
          body: data,
          headers: {
            "Content-Type": "application/json"
          }
        }
      })
    })
  }).done(callback).fail((xhr, status, error) => {
    console.log(status);
    console.log(xhr.responseText);
    console.log(xhr.getAllResponseHeaders());
    throw new Error(error);
  });
}


function postMSGraph(endpoint, data, token, callback) {
  const headers = new Headers();
  const bearer = `Bearer ${token}`;
  headers.append("Authorization", bearer);
  $.ajax({
    headers: {
      Authorization: bearer,
      'Content-Type': 'application/json'
    },
    type: 'POST',
    dataType: 'json',
    contentType: 'application/json',
    url: endpoint,
    data: JSON.stringify(data)
  }).done(callback).fail((xhr, status, error) => {
    console.log(status);
    console.log(xhr.responseText);
    console.log(xhr.getAllResponseHeaders());
    throw new Error(error);
});
}