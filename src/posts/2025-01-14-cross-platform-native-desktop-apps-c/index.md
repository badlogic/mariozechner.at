<%
	meta("../../meta.json")
	meta()
	const path = require('path');
	url = url + "/posts/" + path.basename(path.dirname(outputPath)) + "/";
%>
<%= render("../../_partials/post-header.html", { title, image, url }) %>

**Table of Contents**
<div class="toc">
%%toc%%
</div>

## Introduction

I used to do a lot of cross-platform native apps development but mostly on mobile using Java. Recently I found some interest in creating little desktop tools integrated with various machine learning models. But I hate developing UI applications, so I wanted to have a C abstraction that allows me to do Windows, Linux and Mac OS apps built with CMAKE and Ninja and just have a pleasant development environment and workflow. So in this blog post I'm going to detail how I set that up so you can reproduce it.

## Conclusion