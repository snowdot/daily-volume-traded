const btns = Array.from(document.getElementById('btns').querySelectorAll('button'));
const total = document.getElementById('total');

const separators = num => {
    const num_parts = num.toString().split('.');
    num_parts[0] = num_parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return num_parts.join('.');
}

const render = async() => {
    const input = btns.find(btn => btn.classList.contains('active')).value;
    const resp = await d3.csv(`data/${input}.csv`);
    const data = resp.sort((a, b) => new Date(a.block_signed_at) - new Date(b.block_signed_at));
    const sum = data.reduce((acc, cur) => acc + Number(cur.tokens_traded_usdt), 0);
    
    total.innerText = `Total volume: ${separators(parseInt(sum))} USDT`;

    const outerWidth = 600;
    const outerHeight = 600;
    const margin = {
        top: 20,
        left: 0,
        bottom: 40,
        right: 100
    };
    const innerWidth = outerWidth - margin.left - margin.right;
    const innerHeight = outerHeight - margin.top - margin.bottom;
    const duration = 500;
    const formatTime = d3.timeFormat('%b %d');

    const value = d => Number(d.tokens_traded_usdt);
    const time = d => new Date(d.block_signed_at);

    const xScale = d3.scaleTime()
        .domain(d3.extent(data, d => time(d)))
        .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => value(d)) * 1.01])
        .range([innerHeight, 0])
        .nice();

    const lineGenerator = d3.line()
        .x(d => xScale(time(d)))
        .y(d => yScale(value(d)))
        .curve(d3.curveLinear);

    const svg = d3.select('#chart')
        .selectAll('.chart')
            .data([null])
            .join('svg')
                .classed('chart', true)
                .attr('width', outerWidth)
                .attr('height', outerHeight)
        .selectAll('g')
            .data([null])
            .join('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);
        
    const chartLine = svg.selectAll('.chart-line')
        .data([null])
        .join('path')
            .classed('chart-line', true)
            .attr('d', lineGenerator(data));

    const lenLine = document.querySelector('.chart-line').getTotalLength();

    chartLine
        .attr('stroke-dasharray', lenLine + ' ' + lenLine)
        .attr('stroke-dashoffset', lenLine)
        .transition()
            .duration(duration)
            .ease(d3.easeLinear)
            .attr('stroke-dashoffset', 0);

    const xAxis = d3.axisBottom(xScale)
        .ticks(5)
        .tickFormat(formatTime);

    svg.selectAll('.xAxis')
        .data([null])
        .join('g')
            .classed('xAxis', true)
            .attr('transform', `translate(0, ${innerHeight})`)
        .call(xAxis);

    const yAxis = d3.axisRight(yScale)
        .ticks(5);

    svg.selectAll('.yAxis')
        .data([null])
        .join('g')
            .classed('yAxis', true)
            .attr('transform', `translate(${innerWidth}, 0)`)
        .call(yAxis);

    svg.selectAll('.xGrid')
        .data([null])
        .join('g')
            .classed('xGrid', true)
            .attr('transform', `translate(0, ${innerHeight})`)
        .call(make_x_gridlines()
            .tickSize(-innerHeight)
            .tickFormat('')
        );

    svg.selectAll('.yGrid')
        .data([null])
        .join('g')
            .classed('yGrid', true)
            .attr('transform', `translate(${innerWidth}, 0)`)
        .call(make_y_gridlines()
            .tickSize(-innerWidth)
            .tickFormat('')
        );

    function make_x_gridlines() {
        return d3.axisBottom(xScale).ticks(10);
    }

    function make_y_gridlines() {
        return d3.axisRight(yScale).ticks(10);
    }

    svg.selectAll('.xFocus')
        .data([null])
        .join('line')
            .classed('xFocus', true)
            .attr('y1', yScale(value(data[0])))
            .attr('y2', 0)
            .style('display', 'none');

    svg.selectAll('.yFocus')
        .data([null])
        .join('line')
            .classed('yFocus', true)
            .attr('x1', xScale(time(data[0])))
            .attr('x2', innerWidth)
            .style('display', 'none');

    svg.selectAll('.point')
        .data([null])
        .join('circle')
            .classed('point', true)
            .attr('cx', 0)
            .attr('cy', yScale(value(data[0])))
            .attr('r', 3)
            .style('display', 'none');

    const xLabel = svg.selectAll('.xLabel')
        .data([null])
        .join('g')
            .classed('xLabel', true)
            .style('display', 'none');
          
    xLabel.selectAll('.xLabel-rect')
        .data([null])
        .join('rect')
            .classed('xLabel-rect', true)     
            .attr('width', 100)
            .attr('height', 25)
            .attr('x', 0)
            .attr('y', 0);

    xLabel.selectAll('.xLabel-value')
        .data([null])
        .join('text')
            .classed('xLabel-value', true)
            .text('')
            .attr('x', 10)
            .attr('y', 17);

    const yLabel = svg.selectAll('.yLabel')
        .data([null])
        .join('g')
            .classed('yLabel', true)
            .style('display', 'none');
          
    yLabel.selectAll('.yLabel-rect')
        .data([null])
        .join('rect')
            .classed('yLabel-rect', true)     
            .attr('width', 90)
            .attr('height', 25)
            .attr('x', 0)
            .attr('y', 0);

    yLabel.selectAll('.yLabel-value')
        .data([null])
        .join('text')
            .classed('yLabel-value', true)
            .text('')
            .attr('x', 5)
            .attr('y', 17);

    svg.selectAll('.overlay')
        .data([null])
        .join('rect')
            .classed('overlay', true)
            .attr('width', innerWidth)
            .attr('height', innerHeight)
            .on('mouseover', showTooltip)
            .on('mousemove', event => {
                const bisectDate = d3.bisector(d => time(d)).left;
                const el = xScale.invert(d3.pointer(event)[0]);
                const i = bisectDate(data, el, 1);
                const d0 = data[i - 1];
                const d1 = data[i];
                const d = el - time(d0) > time(d1) - el ? d1 : d0;
                d3.select('.xLabel')
                    .attr('transform', `translate(${innerWidth + 5},${yScale(value(d)) - 10})`);
                    
                d3.select('.xLabel-value')
                    .text(separators(Math.round(value(d))));

                d3.select('.yLabel')
                    .attr('transform', `translate(${xScale(time(d)) - 50},${innerHeight + 5})`);
                    
                d3.select('.yLabel-value')
                    .text(`${formatTime(time(d))}, 2020`);

                d3.select('.xFocus')
                    .attr('x1', xScale(time(d)))
                    .attr('x2', xScale(time(d)));

                d3.select('.yFocus')
                    .attr('y1', yScale(value(d)))
                    .attr('y2', yScale(value(d)));

                d3.select('.point')
                    .attr('cx', xScale(time(d)))
                    .attr('cy', yScale(value(d)));
            })
            .on('mouseout',  hideTooltip);  

    function showTooltip(d, i) {
        d3.select('.xLabel').style('display', null);
        d3.select('.yLabel').style('display', null);
        d3.select('.xFocus').style('display', null);
        d3.select('.yFocus').style('display', null);
        d3.select('.point').style('display', null);
    }

    function hideTooltip(d, i) {
        d3.select('.xLabel').style('display', 'none');
        d3.select('.yLabel').style('display', 'none');
        d3.select('.xFocus').style('display', 'none');
        d3.select('.yFocus').style('display', 'none');
        d3.select('.point').style('display', 'none');
    }
}

const update = e => {
    for(let i = 0; i < btns.length; i++) {
        btns[i].classList.remove('active');
    }

    if(e.target.classList.contains('btn')) {
        e.target.classList.add('active');
    }
}

window.addEventListener('load', render);
btns.forEach(button => button.addEventListener('click', update));
btns.forEach(button => button.addEventListener('click', render));
